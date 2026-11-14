"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { ArrowIcon, Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { clearDraft, readDraft, writeDraft } from "@/lib/drafts";

import type { TurnPhase } from "./use-workspace";

/** The API accepts a trimmed message of 1..4000 characters. */
const MAX_MESSAGE = 4000;

/**
 * Where the user writes.
 *
 * - Enter sends, Shift+Enter breaks the line.
 * - The field grows with the text up to a limit, then scrolls.
 * - While the coach answers, the field is disabled (the flow is one turn at a
 *   time); during the extraction the user may already type the next message.
 * - The text is cleared on send and handed back if the API did not store the
 *   message, so nothing the user wrote is lost and nothing is sent twice.
 * - A `seed` (from the coach's welcome topics) replaces the text with a
 *   sentence start and puts the cursor at the end; it is never sent by itself.
 * - The unsent text is kept per idea in the browser (`lib/drafts.ts`) and
 *   restored on return; it is forgotten once the API stores the message.
 */
export function Composer({
  phase,
  onSend,
  seed,
  offline = false,
  ideaId,
}: {
  /** Whose draft to restore and keep. */
  ideaId: string;
  phase: TurnPhase;
  /** Without a connection the draft can be written but not sent. */
  offline?: boolean;
  onSend: (content: string) => Promise<boolean>;
  /** Text to prefill; `at` changes on every pick so the same text can repeat. */
  seed?: { text: string; at: number } | null;
}) {
  // The workspace renders only in the browser, so reading storage here is safe.
  const [value, setValueState] = useState(() => readDraft(ideaId));
  const field = useRef<HTMLTextAreaElement>(null);

  /** Updates the text and its saved draft together. */
  function setValue(next: string | ((current: string) => string)) {
    setValueState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeDraft(ideaId, resolved);
      return resolved;
    });
  }

  // Apply a new seed while rendering (React's pattern for deriving state from
  // a prop change), then focus the field after the commit.
  const [appliedSeed, setAppliedSeed] = useState<number | undefined>(undefined);
  if (seed && seed.at !== appliedSeed) {
    setAppliedSeed(seed.at);
    setValueState(seed.text);
  }

  useEffect(() => {
    const element = field.current;
    if (!seed || !element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [seed]);

  const answering = phase === "sending" || phase === "streaming";
  const busy = phase !== "idle";
  const trimmed = value.trim();
  const tooLong = trimmed.length > MAX_MESSAGE;
  const canSend = !busy && !offline && trimmed.length > 0 && !tooLong;

  async function submit() {
    if (!canSend) return;
    const content = value;
    setValue("");
    resize("");
    const accepted = await onSend(content);
    if (accepted) {
      // Stored by the API: the draft has done its job. Anything typed while
      // the turn was running is kept.
      if (!field.current?.value.trim()) clearDraft(ideaId);
    } else {
      // Give the text back so nothing the user wrote is lost.
      setValue((current) => current || content);
    }
    field.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  function resize(next?: string) {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    if (next === "") return;
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-line bg-ink-950 px-gutter pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-10"
    >
      <label htmlFor="composer" className="sr-only">
        Escribe tu mensaje al coach
      </label>
      <div
        className={cn(
          "flex items-end gap-3 border border-line-strong bg-ink-900 py-2 pr-2 pl-4 transition-colors duration-300 focus-within:border-amber/70",
          answering && "opacity-70",
        )}
      >
        <textarea
          id="composer"
          ref={field}
          rows={1}
          value={value}
          disabled={answering}
          onChange={(event) => {
            setValue(event.target.value);
            resize(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={answering ? "El coach está respondiendo…" : "Escribe con tus palabras…"}
          aria-describedby="composer-help"
          aria-invalid={tooLong || undefined}
          className="max-h-[200px] min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[0.9375rem] leading-relaxed text-paper placeholder:text-stone focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="shrink-0 px-4"
        >
          <span className="hidden sm:inline">Enviar</span>
          <ArrowIcon />
        </Button>
      </div>
      <p id="composer-help" className="mt-2 flex justify-between gap-4 text-[0.6875rem] text-stone">
        <span className="hidden sm:inline">Intro para enviar · Mayús + Intro para un salto de línea</span>
        <span className={cn("ml-auto tabular-nums", tooLong && "text-danger")}>
          {trimmed.length > MAX_MESSAGE * 0.8 ? `${trimmed.length}/${MAX_MESSAGE}` : ""}
        </span>
      </p>
    </form>
  );
}

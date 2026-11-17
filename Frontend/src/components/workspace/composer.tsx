"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { ArrowIcon, Button } from "@/components/ui/button";
import { ClipIcon } from "@/components/ui/icons";
import {
  ATTACHMENT_ACCEPT,
  attachmentFromFile,
  releaseAttachment,
  type Attachment,
} from "@/lib/attachments";
import { cn } from "@/lib/cn";
import { clearDraft, readDraft, writeDraft } from "@/lib/drafts";

import { AttachmentPreview } from "./attachment-preview";
import type { TurnPhase } from "./use-workspace";

/** The API accepts a trimmed message of 1..4000 characters. */
const MAX_MESSAGE = 4000;

/**
 * Where the user writes.
 *
 * The field sits in a sunken clay well (`shadow-clay-inset`): a slot carved in
 * the surface, with the cream "Enviar" key resting raised at its right edge.
 * At the left edge of the same slot, the paperclip opens the file picker.
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
 * - One image or PDF can ride with the message. The picker filters by
 *   `ATTACHMENT_ACCEPT` and the type is validated again on change; the preview
 *   floats above the well and its X frees the object URL.
 *
 * Attachments are client state only: `onSend` receives the file so the future
 * multipart call can send it, and the workspace simulates the answer today.
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
  /**
   * Sends one turn. `attachment` is `null` for a plain message; a file means
   * the caller must carry it (today: local simulation).
   *
   * @returns `true` when the turn was accepted (the composer can forget both
   *   the text and the file), `false` when it was not (both are handed back).
   */
  onSend: (content: string, attachment: Attachment | null) => Promise<boolean>;
  /** Text to prefill; `at` changes on every pick so the same text can repeat. */
  seed?: { text: string; at: number } | null;
}) {
  // The workspace renders only in the browser, so reading storage here is safe.
  const [value, setValueState] = useState(() => readDraft(ideaId));
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  // The cleanup of the first effect reads the latest attachment through this
  // ref: unmounting must not leak the preview of a file nobody will render.
  const current = useRef<Attachment | null>(null);
  useEffect(() => {
    current.current = attachment;
  }, [attachment]);
  useEffect(() => () => releaseAttachment(current.current), []);

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
  // A file is a message on its own; a plain message still needs text.
  const hasSomething = trimmed.length > 0 || attachment !== null;
  const canSend = !busy && !offline && hasSomething && !tooLong;

  /** Picks the file, validates its type and frees the one it replaces. */
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Empty the input so picking the same file again still fires `change`.
    event.target.value = "";
    if (!file) return;

    const next = attachmentFromFile(file);
    if (!next) return; // Not an image nor a PDF: the chat cannot carry it.

    releaseAttachment(attachment);
    setAttachment(next);
  }

  function removeAttachment() {
    releaseAttachment(attachment);
    setAttachment(null);
    picker.current?.focus();
  }

  async function submit() {
    if (!canSend) return;
    const content = value;
    const sent = attachment;
    setValue("");
    // Ownership of the object URL passes to the message that will render it.
    setAttachment(null);
    resize("");
    const accepted = await onSend(content, sent);
    if (accepted) {
      // Stored by the API: the draft has done its job. Anything typed while
      // the turn was running is kept.
      if (!field.current?.value.trim()) clearDraft(ideaId);
    } else {
      // Give text and file back so nothing the user chose is lost.
      setValue((current) => current || content);
      setAttachment((current) => current ?? sent);
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

      {attachment ? (
        <AttachmentPreview attachment={attachment} onRemove={removeAttachment} disabled={busy} />
      ) : null}

      <div
        className={cn(
          "flex items-end gap-3 rounded-clay-sm border border-black/40 bg-ink-800 py-2 pr-2 pl-3 shadow-clay-inset transition-[color,border-color,box-shadow] duration-300 focus-within:border-amber/70",
          answering && "opacity-70",
        )}
      >
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={busy}
          aria-label="Adjuntar imagen o PDF"
          title="Adjuntar imagen o PDF"
          className={cn(
            "mb-1.5 flex size-9 shrink-0 items-center justify-center rounded-clay-sm bg-ink-800 text-stone shadow-clay-inset transition-colors duration-300 hover:text-paper focus-visible:text-paper disabled:cursor-not-allowed disabled:opacity-50",
            attachment && "text-bronze",
          )}
        >
          <ClipIcon className="size-5" />
        </button>
        <input
          ref={picker}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          hidden
          onChange={handleFile}
          tabIndex={-1}
          aria-hidden="true"
        />

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

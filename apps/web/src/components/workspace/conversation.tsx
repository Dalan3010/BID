"use client";

import { useEffect, useRef } from "react";

import type { WelcomeTopic } from "@/lib/dimensions";

import { CoachWelcome } from "./coach-welcome";
import { CoachAvatar, MessageEntry } from "./message-entry";
import { ThinkingIndicator } from "./thinking-indicator";
import type { ConversationMessage, TurnPhase } from "./use-workspace";

/**
 * The conversation transcript.
 *
 * - Follows new content to the bottom only when the reader is already near
 *   it, so scrolling up to reread is never interrupted.
 * - The list is a `log` region: screen readers announce new messages.
 * - Empty: the coach's welcome (client-only, see `CoachWelcome`).
 * - After the coach's last turn, while idle: one suggested way to answer,
 *   about the first open dimension (the one the coach's agenda asks about).
 *   It only prefills the composer, like the welcome topics.
 */
export function Conversation({
  messages,
  phase,
  ideaTitle,
  topics,
  onPickTopic,
}: {
  messages: readonly ConversationMessage[];
  phase: TurnPhase;
  ideaTitle: string;
  /** Topics the welcome offers (first open dimensions). */
  topics: readonly WelcomeTopic[];
  onPickTopic: (topic: WelcomeTopic) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const lastContent = messages.at(-1)?.content ?? "";

  useEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages.length, lastContent, phase]);

  function handleScroll() {
    const element = scroller.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottom.current = distance < 120;
  }

  const streamingId = phase === "streaming" ? messages.at(-1)?.id : undefined;
  const last = messages.at(-1);
  const suggestion =
    phase === "idle" && last?.role === "assistant" && !last.pending ? topics[0] : undefined;

  return (
    <div
      ref={scroller}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      {messages.length === 0 ? (
        <CoachWelcome ideaTitle={ideaTitle} topics={topics} onPick={onPickTopic} />
      ) : (
        <div role="log" aria-label="Conversación con el coach" aria-live="polite" className="flex flex-col py-4">
          {messages.map((message) => (
            <MessageEntry
              key={message.id}
              message={message}
              streaming={message.id === streamingId}
            />
          ))}
        </div>
      )}

      {suggestion ? (
        <div className="flex flex-wrap items-center gap-2 pr-gutter pb-6 pl-[calc(var(--spacing-gutter)+2.75rem)] lg:pr-10 lg:pl-[calc(2.5rem+2.75rem)]">
          <span className="eyebrow text-stone">Responder sobre</span>
          <button
            type="button"
            onClick={() => onPickTopic(suggestion)}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[0.8125rem] text-paper transition-colors duration-300 hover:border-bronze hover:bg-bronze/10"
          >
            {suggestion.label}
            <span className="text-stone">“{suggestion.starter.trim()}…”</span>
          </button>
        </div>
      ) : null}

      {phase === "sending" || phase === "extracting" ? (
        <div className="flex items-center gap-3 px-gutter pt-2 pb-6 lg:px-10">
          <CoachAvatar />
          <ThinkingIndicator
            label={phase === "sending" ? "Pensando contigo…" : "Voy entendiendo lo que me contaste…"}
          />
        </div>
      ) : null}
    </div>
  );
}

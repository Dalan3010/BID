import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

import { CopyButton } from "./copy-button";
import { RichText } from "./rich-text";
import type { ConversationMessage } from "./use-workspace";

/**
 * One message as a chat bubble.
 *
 * - The coach speaks from the left, with its monogram avatar, on a raised
 *   graphite bubble with a hairline border.
 * - The user speaks from the right, on a lighter bubble without avatar.
 * - The corner nearest the speaker is squared, so each bubble "points" to who
 *   said it. Time (or "enviando" / "escribiendo") sits under the bubble.
 *
 * The visual language stays the studio's: dark palette, almost-square radii,
 * no gradients or glow.
 */
export function MessageEntry({
  message,
  streaming = false,
}: {
  message: ConversationMessage;
  /** True while this message is still arriving from the stream. */
  streaming?: boolean;
}) {
  const fromCoach = message.role === "assistant";

  const meta = message.pending
    ? streaming
      ? "escribiendo"
      : "enviando"
    : formatTime(message.createdAt);

  return (
    <ChatBubble
      id={messageAnchor(message.id)}
      from={fromCoach ? "coach" : "user"}
      meta={meta}
      actions={
        fromCoach && !message.pending && message.content ? (
          <CopyButton text={message.content} />
        ) : null
      }
    >
      {message.content ? <RichText text={message.content} /> : null}
      {streaming ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1.1em] w-px translate-y-[0.2em] animate-pulse bg-bronze"
        />
      ) : null}
    </ChatBubble>
  );
}

/**
 * The bubble frame, shared by real messages and the coach's welcome.
 */
export function ChatBubble({
  from,
  meta,
  actions,
  children,
  label,
  id,
}: {
  from: "coach" | "user";
  /** Small line under the bubble (time, state). */
  meta?: ReactNode;
  /** Controls next to the meta line (e.g. "Copiar"). */
  actions?: ReactNode;
  children: ReactNode;
  /** Accessible name of the article; defaults to who speaks. */
  label?: string;
  /** DOM id, so the plan can jump to the message a node came from. */
  id?: string;
}) {
  const fromCoach = from === "coach";

  return (
    <article
      id={id}
      // Focusable by script only, so "Ver en la conversación" can move focus here.
      tabIndex={id ? -1 : undefined}
      aria-label={label ?? (fromCoach ? "Mensaje del coach" : "Tu mensaje")}
      className={cn(
        "flex gap-3 px-gutter py-2.5 focus:outline-none lg:px-10",
        fromCoach ? "justify-start" : "justify-end",
      )}
    >
      {fromCoach ? <CoachAvatar /> : null}

      <div className={cn("flex max-w-[min(42rem,85%)] flex-col gap-1.5", !fromCoach && "items-end")}>
        <div
          data-bubble
          className={cn(
            "px-4 py-3 text-[0.9375rem] leading-[1.65] sm:px-5",
            fromCoach
              ? "rounded-lg rounded-tl-xs border border-line bg-ink-900 text-paper"
              : "rounded-lg rounded-tr-xs bg-ink-700 text-paper",
          )}
        >
          {children}
        </div>
        {meta || actions ? (
          <div className="flex items-center gap-3 px-1">
            {meta ? (
              <span className="text-[0.6875rem] text-stone tabular-nums">
                <span className="sr-only">{fromCoach ? "Coach, " : "Tú, "}</span>
                {meta}
              </span>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** The coach's monogram: a serif italic "c" in a bronze ring. Decorative. */
export function CoachAvatar() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-bronze/60 bg-ink-900 font-serif text-lg leading-none text-bronze italic"
    >
      c
    </span>
  );
}

/** DOM id of a message, shared by the conversation and "Ver en la conversación". */
export function messageAnchor(messageId: string): string {
  return `mensaje-${messageId}`;
}

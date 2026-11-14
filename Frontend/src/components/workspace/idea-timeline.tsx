"use client";

import type { ChatMessage, IdeaNode } from "@bid/core";
import { useMemo } from "react";

import { cn } from "@/lib/cn";
import { DIMENSIONS } from "@/lib/dimensions";
import { formatDate, formatTime } from "@/lib/format";
import { buildTimeline, type TimelineEvent } from "@/lib/timeline";

import { TraceButton } from "./dimension-entry";

const LABEL: Record<Exclude<TimelineEvent["kind"], "message">, string> = {
  proposed: "Propuesto",
  added: "Añadido",
  confirmed: "Confirmado",
  edited: "Escrito por ti",
};

/**
 * "Línea de tiempo" — how the idea evolved, rebuilt from real timestamps
 * (`buildTimeline`). It is not a version history; the note says so.
 */
export function IdeaTimeline({
  messages,
  nodes,
  onTrace,
}: {
  messages: readonly Pick<ChatMessage, "id" | "role" | "content" | "createdAt">[];
  nodes: readonly IdeaNode[];
  onTrace: (messageId: string | null) => (() => void) | undefined;
}) {
  // Each event knows its day and whether it opens a new day, computed once.
  const events = useMemo(
    () =>
      buildTimeline(messages, nodes).map((event, index, all) => {
        const day = formatDate(event.at);
        return { event, day, showDay: index === 0 || day !== formatDate(all[index - 1].at) };
      }),
    [messages, nodes],
  );

  if (events.length === 0) {
    return <p className="text-[0.8125rem] text-stone">Todavía no hay actividad en esta idea.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.8125rem] leading-relaxed text-stone">
        Reconstruida con las fechas de mensajes y validaciones. No es un historial de versiones:
        las propuestas descartadas ya no aparecen.
      </p>
      <ol className="relative flex flex-col border-l border-line pl-5">
        {events.map(({ event, day, showDay }) => {
          return (
            <li key={event.id} className="relative py-2.5">
              {showDay ? <p className="eyebrow mb-2 -ml-5 bg-ink-950 py-1 text-stone">{day}</p> : null}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-[1.15rem] -left-[1.4rem] size-2 rounded-full",
                  event.kind === "message" && "bg-ink-700 ring-1 ring-line-strong",
                  event.kind === "proposed" && "ring-1 ring-amber",
                  event.kind === "added" && "bg-stone",
                  (event.kind === "confirmed" || event.kind === "edited") && "bg-sage",
                  showDay && "top-[3.15rem]",
                )}
              />
              <p className="flex flex-wrap items-baseline gap-x-2 text-[0.75rem] text-stone">
                <time dateTime={event.at} className="tabular-nums">
                  {formatTime(event.at)}
                </time>
                <span className="text-mist">
                  {event.kind === "message"
                    ? event.role === "assistant"
                      ? "El coach respondió"
                      : "Escribiste"
                    : `${LABEL[event.kind]} · ${DIMENSIONS[event.type].label}`}
                </span>
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-mist">
                {event.kind === "message" ? event.excerpt : event.content}
              </p>
              {event.kind === "message" ? (
                <TraceButton onClick={onTrace(event.id.slice(2))} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

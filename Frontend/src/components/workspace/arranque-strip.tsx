"use client";

import { nextStep } from "@bid/core";

import { Button } from "@/components/ui/button";

import type { ArranqueSteps } from "./use-arranque-steps";

/**
 * The arranque, right above the composer.
 *
 * Once the plan is complete, the chat and the step list have to move together:
 * the coach asks about a step and the person needs, in the same place, the way
 * to say "this one is done". Without it the conversation froze — the coach
 * asked about the same step forever and the only way out lived in the other
 * pane. The full list stays in "El arranque"; this is the one line that keeps
 * the conversation moving (rule 1: the person decides when a step is done).
 *
 * Nothing here moves the person to another pane on its own: on a narrow screen
 * that hides the conversation, composer included, and asking for steps looked
 * like the chat had stopped working. The proposals land right here instead.
 */
export function ArranqueStrip({
  arranque,
  onShowPlan,
}: {
  arranque: ArranqueSteps;
  /** Opens the full step list. Only ever runs because the person asked. */
  onShowPlan: () => void;
}) {
  const { load, steps, proposals, asking, quotaNotice } = arranque;

  if (load.status !== "ready") return null;

  const next = nextStep(steps);
  const saving = next ? arranque.saving.has(next.id) : false;
  const error = next ? arranque.stepErrors[next.id] : undefined;
  const done = steps.filter((step) => step.status === "done").length;

  return (
    <div className="border-t border-line bg-ink-900/60 px-gutter py-3 lg:px-10 print:hidden">
      {next ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-mist">
            <span className="eyebrow mr-2 text-bronze">Paso en curso</span>
            <span className="text-paper">{next.title}</span>
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void arranque.toggle(next)}
              loading={saving}
              loadingLabel="Guardando…"
              aria-label={`Marcar como hecho: ${next.title}`}
            >
              Ya lo hice
            </Button>
            <Button variant="ghost" size="sm" onClick={onShowPlan}>
              Ver el arranque
            </Button>
          </div>

          {error ? (
            <p role="alert" className="w-full text-[0.75rem] text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-mist">
            {steps.length === 0
              ? "El plan está completo: el siguiente paso es arrancar. Puedes pedirle al coach los primeros pasos."
              : `No te quedan pasos abiertos${done > 0 ? ` · ${done} hecho${done === 1 ? "" : "s"}` : ""}. Pídele al coach los siguientes.`}
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void arranque.ask()}
            loading={asking}
            loadingLabel="Pidiendo pasos…"
            className="shrink-0"
          >
            Pedir pasos al coach
          </Button>
        </div>
      )}

      {/* The proposals stay in the conversation: the person asked here, the
          answer arrives here, and nothing jumps to the other pane. */}
      {proposals.length > 0 ? (
        <ul aria-label="Pasos propuestos" className="mt-3 flex flex-col gap-2">
          {proposals.map((proposal) => (
            <li
              key={proposal.key}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line/60 pt-2 first:border-0 first:pt-0"
            >
              <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-paper">
                {proposal.title}
              </p>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void arranque.accept(proposal)}
                  loading={arranque.accepting.has(proposal.key)}
                  loadingLabel="Añadiendo…"
                  aria-label={`Añadir al arranque: ${proposal.title}`}
                >
                  Añadir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => arranque.discard(proposal)}
                  disabled={arranque.accepting.has(proposal.key)}
                >
                  Descartar
                </Button>
              </div>

              {arranque.acceptErrors[proposal.key] ? (
                <p role="alert" className="w-full text-[0.75rem] text-danger">
                  {arranque.acceptErrors[proposal.key]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {quotaNotice ? (
        <p role="status" className="mt-2 text-[0.75rem] leading-relaxed text-stone">
          {quotaNotice}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { nextStep, type ArranqueStep } from "@bid/core";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { StatusTag } from "@/components/ui/status-tag";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";

import {
  STEPS_EMPTY_MESSAGE,
  type ArranqueSteps,
  type PanelProposal,
} from "./use-arranque-steps";

/**
 * "El arranque" — the accompaniment that follows the validated plan.
 *
 * The ten dimensions stay closed once complete (D-A): what follows is work,
 * not more structure, and it lives here, never inside the plan. The coach
 * drives one step at a time — `nextStep` marks the one it will ask about —
 * and the person decides what becomes a real step (rule 1: the coach
 * proposes, the person validates).
 *
 * `ArranquePanel` renders the state the workspace owns (`useArranqueSteps`), so
 * the panel and the strip above the composer always agree about the current
 * step.
 */
export function ArranquePanel({ arranque }: { arranque: ArranqueSteps }) {
  const { load, steps, proposals } = arranque;
  const open = steps.filter((step) => step.status === "open").length;
  const done = steps.length - open;
  const next = nextStep(steps);

  return (
    <section
      aria-labelledby="arranque-title"
      className="border-t border-line px-gutter py-8 lg:px-8 print:border-0 print:px-0"
    >
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3 text-bronze">El arranque</p>
          <h2 id="arranque-title" className="font-serif text-title text-paper">
            Lo que sigue
          </h2>
          {steps.length > 0 ? (
            <p className="mt-2 text-[0.8125rem] text-stone" aria-live="polite">
              {plural(open, "paso abierto", "pasos abiertos")}
              {done > 0 ? ` · ${plural(done, "hecho", "hechos")}` : ""}
            </p>
          ) : null}
        </div>
      </header>

      {load.status === "error" ? (
        <div className="mt-6">
          <Alert
            tone="error"
            title="Tus pasos no se cargaron"
            action={
              <Button variant="secondary" size="sm" onClick={arranque.retryLoad}>
                Reintentar
              </Button>
            }
          >
            {load.message}
          </Alert>
        </div>
      ) : null}

      {arranque.quotaNotice ? (
        <div className="mt-6">
          <Alert
            tone="warning"
            title="Límite de propuestas alcanzado"
            action={
              <Button variant="ghost" size="sm" onClick={arranque.dismissQuota}>
                Entendido
              </Button>
            }
          >
            {arranque.quotaNotice}
          </Alert>
        </div>
      ) : null}

      {arranque.proposeError ? (
        <div className="mt-6">
          <Alert
            tone="error"
            title="El coach no pudo proponerte pasos"
            action={
              <Button variant="ghost" size="sm" onClick={arranque.dismissProposeError}>
                Cerrar
              </Button>
            }
          >
            {arranque.proposeError}
          </Alert>
        </div>
      ) : null}

      {load.status === "loading" ? (
        <div className="mt-8 flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-3 w-24" />
          {[0, 1].map((row) => (
            <SkeletonText key={row} lines={2} />
          ))}
        </div>
      ) : null}

      {load.status === "ready" && steps.length === 0 && proposals.length === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-4">
          <p className="max-w-md text-[0.8125rem] leading-relaxed text-mist">
            El plan está validado. Ahora puedes arrancar: pide al coach los primeros pasos
            concretos para tu idea.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void arranque.ask()}
            loading={arranque.asking}
            loadingLabel="Pidiendo pasos…"
            className="print:hidden"
          >
            Pedir pasos al coach
          </Button>
        </div>
      ) : null}

      {arranque.askedEmpty && proposals.length === 0 && load.status === "ready" ? (
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-stone" role="status">
          {STEPS_EMPTY_MESSAGE}
        </p>
      ) : null}

      {proposals.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4 print:hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-serif text-lg text-paper">El coach propone</h3>
            <span className="eyebrow text-amber">
              {plural(proposals.length, "propuesta", "propuestas")}
            </span>
          </div>
          <p className="text-[0.8125rem] leading-relaxed text-mist">
            Son propuestas, no pasos guardados: no entran en tu lista hasta que decidas.
          </p>
          <ul className="flex flex-col gap-3">
            {proposals.map((proposal) => (
              <ProposalRow
                key={proposal.key}
                proposal={proposal}
                saving={arranque.accepting.has(proposal.key)}
                error={arranque.acceptErrors[proposal.key]}
                onAccept={() => void arranque.accept(proposal)}
                onDiscard={() => arranque.discard(proposal)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {steps.length > 0 && done === 0 ? (
        // The rule the product lives by, said once and where it applies: steps
        // are closed by the person, never by the coach. It disappears on its
        // own after the first step is done — no flag to store, no nagging.
        <p className="mt-6 border-l-2 border-bronze/50 pl-3 text-[0.8125rem] leading-relaxed text-stone">
          Los pasos los cierras tú: el coach no avanza al siguiente hasta que
          marques uno como hecho.
        </p>
      ) : null}

      {steps.length > 0 ? (
        <ol
          aria-label="Pasos del arranque"
          className="mt-6 flex flex-col print:mt-4"
        >
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              next={next?.id === step.id}
              saving={arranque.saving.has(step.id)}
              error={arranque.stepErrors[step.id]}
              onToggle={() => void arranque.toggle(step)}
            />
          ))}
        </ol>
      ) : null}
    </section>
  );
}

/** One stored step: what it says, where it stands, and its state change. */
function StepRow({
  step,
  next,
  saving,
  error,
  onToggle,
}: {
  step: ArranqueStep;
  /** True when this is the step the coach will ask about next. */
  next: boolean;
  saving: boolean;
  error: string | undefined;
  onToggle: () => void;
}) {
  const done = step.status === "done";

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-line py-4 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusTag
            status={done ? "validated" : "open"}
            label={done ? "Hecho" : "Abierto"}
          />
          {next ? <span className="eyebrow text-bronze">Siguiente</span> : null}
          <span className={cn("text-[0.9375rem]", done ? "text-stone" : "text-paper")}>
            {step.title}
          </span>
        </p>
        {step.detail ? (
          <p className="max-w-md text-[0.8125rem] leading-relaxed text-mist">{step.detail}</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-[0.75rem] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        loading={saving}
        loadingLabel="Guardando…"
        className="print:hidden"
      >
        {done ? "Abrir de nuevo" : "Marcar como hecho"}
      </Button>
    </li>
  );
}

/** One proposal on the table: it becomes a step only through "Añadir". */
function ProposalRow({
  proposal,
  saving,
  error,
  onAccept,
  onDiscard,
}: {
  proposal: PanelProposal;
  saving: boolean;
  error: string | undefined;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  return (
    <li
      aria-busy={saving || undefined}
      className="flex flex-col gap-3 rounded-clay-lg border border-paper/[0.07] bg-ink-850 p-4 shadow-clay sm:p-5"
    >
      <p className="text-[0.9375rem] text-paper">{proposal.title}</p>
      {proposal.detail ? (
        <p className="text-[0.8125rem] leading-relaxed text-mist">{proposal.detail}</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-[0.75rem] text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onAccept}
          loading={saving}
          loadingLabel="Añadiendo…"
        >
          Añadir al arranque
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
          Descartar
        </Button>
      </div>
    </li>
  );
}

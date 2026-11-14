import Image from "next/image";
import Link from "next/link";

import { ProgressBar } from "@/components/ui/progress";
import type { IdeaProgress } from "@/lib/api";
import { coverFor } from "@/lib/covers";
import { cn } from "@/lib/cn";
import { DIMENSIONS, STATUS_LABEL, statusesFromAgenda } from "@/lib/dimensions";
import { formatRelative, plural, toPercent } from "@/lib/format";

/**
 * One idea in the studio, laid out as an editorial entry rather than a card:
 * a running number, a cropped photograph, the title in serif, and a column of
 * facts that all come from `GET /api/ideas` (completion, gaps, agenda, date).
 */
export function IdeaEntry({
  entry,
  index,
}: {
  entry: IdeaProgress;
  index: number;
}) {
  const { idea, completion, gaps, agenda } = entry;
  const percent = toPercent(completion);
  const next = agenda[0];
  const pendingReview = agenda.filter((gap) => gap.hasProposals).length;
  const complete = gaps === 0;
  const marks = statusesFromAgenda(agenda);

  return (
    <li data-reveal className="border-b border-line">
      <Link
        href={`/ideas/${idea.id}`}
        className="group grid gap-6 py-8 transition-colors duration-500 hover:bg-paper/[0.02] focus-visible:bg-paper/[0.03] md:grid-cols-12 md:gap-8 md:py-10"
      >
        {/* Number + cover */}
        <div className="flex items-start gap-5 md:col-span-4 lg:col-span-3">
          <span className="eyebrow w-6 shrink-0 pt-1 text-stone">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-800">
            <Image
              src={coverFor(idea.id)}
              alt=""
              fill
              sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 90vw"
              className="object-cover opacity-80 transition-[transform,opacity] duration-[1600ms] ease-[var(--ease-studio)] group-hover:scale-[1.04] group-hover:opacity-100"
            />
          </div>
        </div>

        {/* Title + summary */}
        <div className="flex flex-col gap-4 md:col-span-5 lg:col-span-5">
          <h3 className="font-serif text-title text-paper transition-colors group-hover:text-white">
            {idea.title}
          </h3>
          {idea.summary ? (
            <p className="line-clamp-3 max-w-prose text-sm leading-relaxed text-mist">
              {idea.summary}
            </p>
          ) : (
            <p className="text-sm text-stone italic">Todavía sin resumen.</p>
          )}
          <span className="eyebrow mt-auto inline-flex items-center gap-2 text-stone transition-colors group-hover:text-paper">
            Abrir el espacio de trabajo
            <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>

        {/* Facts */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-start text-sm md:col-span-3 md:grid-cols-1 lg:col-span-4 lg:grid-cols-2">
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1 lg:col-span-2">
            <div className="flex items-baseline justify-between">
              <dt className="eyebrow text-stone">Plan validado</dt>
              <dd className="font-serif text-2xl text-paper">
                {percent}
                <span className="text-sm text-stone">%</span>
              </dd>
            </div>
            <ProgressBar value={percent} label={`Progreso de ${idea.title}`} />
            <DimensionMarks marks={marks} />
          </div>

          <div>
            <dt className="eyebrow mb-1.5 text-stone">Pendientes</dt>
            <dd className="text-mist">
              {complete ? "Ninguna" : plural(gaps, "dimensión", "dimensiones")}
              {pendingReview > 0 ? (
                <span className="mt-1 block text-[0.8125rem] text-amber">
                  {plural(pendingReview, "propuesta", "propuestas")} por revisar
                </span>
              ) : null}
            </dd>
          </div>

          <div>
            <dt className="eyebrow mb-1.5 text-stone">Siguiente</dt>
            <dd className="text-mist">{next ? DIMENSIONS[next.type].label : "Plan completo"}</dd>
          </div>

          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <dt className="eyebrow mb-1.5 text-stone">Actualizada</dt>
            <dd className="text-mist">
              <time dateTime={idea.updatedAt}>{formatRelative(idea.updatedAt)}</time>
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

/**
 * Ten marks, one per dimension, in canonical order (RF-43): filled for
 * validated, half for pending proposals, a ring for open. Each has a native
 * tooltip; the list is read by screen readers as "Problema: Validada", etc.
 */
function DimensionMarks({ marks }: { marks: ReturnType<typeof statusesFromAgenda> }) {
  return (
    <ul aria-label="Estado de cada dimensión" className="flex items-center gap-1.5">
      {marks.map(({ type, status }) => (
        <li key={type} title={`${DIMENSIONS[type].label}: ${STATUS_LABEL[status]}`}>
          <span className="sr-only">
            {DIMENSIONS[type].label}: {STATUS_LABEL[status]}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "block h-3 w-1.5 rounded-[1px]",
              status === "validated" && "bg-sage",
              status === "pending" && "bg-[linear-gradient(0deg,var(--color-amber)_50%,transparent_50%)] ring-1 ring-amber/70",
              status === "open" && "ring-1 ring-line-strong",
            )}
          />
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useId, type RefObject } from "react";

import { cn } from "@/lib/cn";
import { STAGE_LABEL, type IdeaStage } from "@/lib/ideas-filter";

type StageFilter = IdeaStage | "all";

const STAGES: readonly StageFilter[] = ["all", "empty", "progress", "complete"];

/**
 * Search box and stage filter for the studio's list (RF-15).
 *
 * The search sits in a sunken clay well (`shadow-clay-inset`), the same recipe
 * as `TextField`: a slot carved in the surface, not a line drawn on it. The
 * stage filter is a group of toggle buttons (`aria-pressed`), each with its
 * count, so the person sees how many ideas fall in each stage before choosing;
 * the active one is a raised clay pill, the rest stay flat until hovered.
 * Filtering happens in the browser over data already loaded.
 */
export function IdeaFilters({
  query,
  onQueryChange,
  stage,
  onStageChange,
  counts,
  inputRef,
}: {
  /** Lets the "/" shortcut focus the search box. */
  inputRef?: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (query: string) => void;
  stage: StageFilter;
  onStageChange: (stage: StageFilter) => void;
  counts: Readonly<Record<StageFilter, number>>;
}) {
  const searchId = useId();

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="relative md:w-80">
        <label htmlFor={searchId} className="sr-only">
          Buscar ideas
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-stone"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3 3" />
        </svg>
        <input
          ref={inputRef}
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nombre o resumen  ( / )"
          className="w-full rounded-clay-sm border border-black/40 bg-ink-800 py-2.5 pr-3 pl-10 text-sm text-paper shadow-clay-inset transition-[border-color,background-color] duration-300 placeholder:text-stone hover:bg-ink-700/60 focus:border-amber/70 focus:bg-ink-800 focus:outline-none focus-visible:outline-none"
        />
      </div>

      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
        {STAGES.map((value) => {
          const active = value === stage;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onStageChange(value)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] transition-[color,background-color,border-color,box-shadow] duration-300",
                active
                  ? "border-paper/[0.08] bg-ink-900 text-paper shadow-clay"
                  : "border-transparent text-stone hover:bg-paper/[0.04] hover:text-mist",
              )}
            >
              {STAGE_LABEL[value]}
              <span className={cn("tabular-nums", active ? "text-bronze" : "text-stone")}>
                {counts[value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

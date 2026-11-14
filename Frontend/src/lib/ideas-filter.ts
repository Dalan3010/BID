/**
 * Search and filter for the studio's list of ideas (RF-15).
 *
 * Pure functions over the rows `GET /api/ideas` already returned: nothing is
 * requested again and nothing is invented.
 */
import type { IdeaProgress } from "./api";

/** Where an idea stands, derived from its real completion. */
export type IdeaStage = "empty" | "progress" | "complete";

export const STAGE_LABEL: Readonly<Record<IdeaStage | "all", string>> = {
  all: "Todas",
  empty: "Sin empezar",
  progress: "En curso",
  complete: "Completas",
};

/** 0 validated → empty; 10 of 10 → complete; anything else → in progress. */
export function ideaStage(entry: IdeaProgress): IdeaStage {
  if (entry.gaps === 0) return "complete";
  if (entry.completion <= 0) return "empty";
  return "progress";
}

/** Lowercase without accents, so "cafe" finds "Café". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Ideas whose title or summary contain every word of `query`, in the given
 * stage. The original order is kept.
 */
export function filterIdeas(
  ideas: readonly IdeaProgress[],
  query: string,
  stage: IdeaStage | "all",
): IdeaProgress[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);

  return ideas.filter((entry) => {
    if (stage !== "all" && ideaStage(entry) !== stage) return false;
    if (words.length === 0) return true;
    const haystack = normalize(`${entry.idea.title} ${entry.idea.summary}`);
    return words.every((word) => haystack.includes(word));
  });
}

/** How many ideas fall in each stage, for the filter's counters. */
export function countByStage(
  ideas: readonly IdeaProgress[],
): Record<IdeaStage | "all", number> {
  const counts = { all: ideas.length, empty: 0, progress: 0, complete: 0 };
  for (const entry of ideas) counts[ideaStage(entry)] += 1;
  return counts;
}

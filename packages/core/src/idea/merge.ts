import type { NodeSource } from "./types";

/**
 * Merge precedence between node provenance values (D3).
 *
 * `edited > confirmed > inferred`
 *
 * A higher rank means a more trustworthy value: the user wrote it by hand,
 * validated an AI proposal, or has not looked at it yet. Every rule about
 * overwriting a node is expressed through this ordering, so there is exactly one
 * place to change if the policy ever moves.
 */

export const SOURCE_RANK: Readonly<Record<NodeSource, number>> = {
  inferred: 0,
  confirmed: 1,
  edited: 2,
};

/** True when a value with `incoming` provenance may replace one with `existing`. */
export function outranks(incoming: NodeSource, existing: NodeSource): boolean {
  return SOURCE_RANK[incoming] > SOURCE_RANK[existing];
}

/**
 * True when a node may move from `existing` to `incoming` provenance.
 *
 * Equal rank is allowed: re-confirming a confirmed node or re-editing an edited
 * one is not a demotion.
 */
export function canTransition(
  existing: NodeSource,
  incoming: NodeSource,
): boolean {
  return SOURCE_RANK[incoming] >= SOURCE_RANK[existing];
}

/**
 * Direct editing is reserved for validated knowledge (D3).
 *
 * An `inferred` node has to be confirmed first: editing it silently would turn
 * an AI guess into the user's words, which is exactly the provenance bug this
 * model exists to prevent.
 */
export function isEditable(source: NodeSource): boolean {
  return source === "confirmed" || source === "edited";
}

/**
 * Resolves two competing values for the same slot.
 *
 * Ties keep the existing value: an incoming value has to be strictly more
 * trustworthy to win.
 */
export function resolveConflict<T extends { readonly source: NodeSource }>(
  existing: T,
  incoming: T,
): T {
  return outranks(incoming.source, existing.source) ? incoming : existing;
}

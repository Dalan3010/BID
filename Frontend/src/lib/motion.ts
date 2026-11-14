/**
 * Shared motion vocabulary.
 *
 * Every animation in BID uses these easings and durations so the whole product
 * moves with one rhythm: slow to arrive, quick to settle, never bouncy.
 */

/** Easing names understood by Anime.js 4. */
export const EASE = {
  /** Default for entrances: decelerates long, like a camera settling. */
  enter: "outExpo",
  /** For gentle continuous motion (photo drift). */
  drift: "inOutSine",
  /** For small UI responses. */
  ui: "outQuart",
} as const;

/** Durations in milliseconds. */
export const DURATION = {
  photo: 2200,
  headline: 1200,
  block: 900,
  ui: 420,
} as const;

/** True when the user asked the OS for less motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

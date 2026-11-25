/**
 * A monotonic clock for the in-memory repositories.
 *
 * They stamped everything with `new Date().toISOString()`, which has
 * millisecond resolution: two writes in the same millisecond got the *same*
 * timestamp, and any rule that compares times (`stepAlreadyRaised`, "was this
 * message written after that step?") answered wrongly — a real flake that
 * appeared in roughly half the runs of `chat.test.ts`.
 *
 * The production tables do not have this problem (Postgres keeps microseconds),
 * so the fix belongs here, in the test doubles: every call returns a time
 * strictly after the previous one, and all the repositories share the counter
 * because ordering only means something *across* them.
 */

/** How far ahead of the wall clock the virtual clock may drift. */
let tick = 0;

/** A timestamp that is always later than the previous one. */
export function nextTimestamp(): string {
  tick += 1;
  return new Date(Date.now() + tick).toISOString();
}

/** Restarts the sequence. A test that needs a clean history calls it. */
export function resetClock(): void {
  tick = 0;
}

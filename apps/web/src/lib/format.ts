/**
 * Formatting helpers for dates and numbers, in Spanish.
 *
 * Every function takes an explicit `now` where time matters, so the output is
 * deterministic and testable.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

/** "7 nov 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

/** "14:05". */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : TIME_FORMAT.format(date);
}

/**
 * "hace 5 min", "hace 3 h", "ayer", "hace 4 días" or a date.
 *
 * Relative wording up to a week, absolute after that: past a week the exact
 * day is more useful than "hace 12 días".
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;

  return formatDate(iso);
}

/** 0.7 → 70. Clamped to 0..100. */
export function toPercent(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

/** "1 dimensión" / "3 dimensiones". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** First name for a greeting; falls back to nothing rather than to an email. */
export function firstName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "";
}

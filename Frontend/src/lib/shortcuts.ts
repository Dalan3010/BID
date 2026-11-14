/**
 * Keyboard shortcuts: the catalogue and the matching rules.
 *
 * Single-key shortcuts never fire while the person types in a field, so "n"
 * or "/" inside a message are just letters. Digits use `event.code`
 * (`Digit1`), because with Alt held some layouts report another character in
 * `event.key` (macOS turns Alt+1 into "¡").
 */

/** A key combination. */
export interface ShortcutSpec {
  /** Compared with `event.key` (e.g. "/", "n", "?", "Escape"). */
  readonly key?: string;
  /** Compared with `event.code` (e.g. "Digit1"); takes precedence over `key`. */
  readonly code?: string;
  readonly alt?: boolean;
}

/** One entry of the help dialog. */
export interface ShortcutHelp {
  readonly keys: readonly string[];
  readonly label: string;
  readonly scope: "General" | "Estudio" | "Espacio de trabajo";
}

/** Everything the help dialog lists. Keep in sync with the `useShortcut` calls. */
export const SHORTCUTS: readonly ShortcutHelp[] = [
  { keys: ["?"], label: "Ver esta ayuda", scope: "General" },
  { keys: ["/"], label: "Buscar ideas", scope: "Estudio" },
  { keys: ["N"], label: "Nueva idea", scope: "Estudio" },
  { keys: ["/"], label: "Escribir al coach", scope: "Espacio de trabajo" },
  { keys: ["Alt", "1"], label: "Ir a la conversación", scope: "Espacio de trabajo" },
  { keys: ["Alt", "2"], label: "Ir al plan", scope: "Espacio de trabajo" },
  { keys: ["Esc"], label: "Plegar «Lo que hemos identificado»", scope: "Espacio de trabajo" },
  { keys: ["Intro"], label: "Enviar mensaje", scope: "Espacio de trabajo" },
  { keys: ["Mayús", "Intro"], label: "Salto de línea", scope: "Espacio de trabajo" },
];

/** The minimal event shape needed (a `KeyboardEvent` satisfies it). */
export interface KeyLike {
  readonly key: string;
  readonly code: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

/** True when the event is exactly this combination. */
export function matchesShortcut(event: KeyLike, spec: ShortcutSpec): boolean {
  if (event.ctrlKey || event.metaKey) return false;
  if (Boolean(spec.alt) !== event.altKey) return false;
  if (spec.code) return event.code === spec.code;
  return spec.key !== undefined && event.key.toLowerCase() === spec.key.toLowerCase();
}

/** True when the focused element takes text, so letters must not be stolen. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const element = target as HTMLElement;
  if (element.isContentEditable) return true;
  return Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
}

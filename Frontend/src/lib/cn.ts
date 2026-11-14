/**
 * Joins class names, skipping falsy values.
 *
 * Deliberately tiny: the design system avoids conflicting utilities by
 * construction, so no merge library is needed.
 */
export function cn(
  ...classes: ReadonlyArray<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Tolerant JSON reading for model output.
 *
 * The model is asked for JSON, but models are models: they can wrap it in a
 * code fence, add prose around it, or return something that is not JSON at
 * all. Reading it tolerantly is a **boundary** decision, not a convenience:
 * whatever reaches the domain is always a validated object, never a repaired
 * guess.
 */

/** Finds the JSON object inside a text that may contain more than JSON. */
export function unwrapJson(raw: string): unknown {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through: the answer may be wrapped.
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

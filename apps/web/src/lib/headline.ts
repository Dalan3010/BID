/**
 * Parses editorial headlines.
 *
 * Accent words are written between asterisks and rendered in the serif
 * italic: `"Las ideas merecen un *lugar*."`.
 */

export interface HeadlineWord {
  readonly text: string;
  readonly accent: boolean;
}

/** "a *b c* d." → a, b(accent), c(accent), d. */
export function parseWords(text: string): HeadlineWord[] {
  const words: HeadlineWord[] = [];
  let accent = false;

  for (const raw of text.split(/\s+/).filter(Boolean)) {
    if (raw.startsWith("*")) accent = true;
    // A closing marker may be followed by punctuation: "*lugar*."
    const closes = /\*[.,;:!?…»”"]*$/.test(raw);
    words.push({ text: raw.replace(/\*/g, ""), accent });
    if (closes) accent = false;
  }

  return words;
}

/** The headline without accent markers. */
export function plainText(text: string): string {
  return text.replace(/\*/g, "");
}

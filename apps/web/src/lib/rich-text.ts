/**
 * A tiny, safe reader for the coach's text.
 *
 * The scripted coach answers plain text; a live model may add light markdown.
 * This turns text into blocks (paragraphs and lists) with inline segments
 * (plain or bold). It never produces HTML: the component renders React
 * elements, so nothing the model writes can inject markup.
 */

export interface InlineSegment {
  readonly text: string;
  readonly strong: boolean;
}

export type TextBlock =
  | { readonly kind: "paragraph"; readonly lines: InlineSegment[][] }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: InlineSegment[][] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

/** Splits `**bold**` runs; unmatched markers stay as text. */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start), strong: false });
    segments.push({ text: match[1], strong: true });
    last = start + match[0].length;
  }

  if (last < text.length) segments.push({ text: text.slice(last), strong: false });

  return segments.length > 0 ? segments : [{ text, strong: false }];
}

/** Text → blocks. Blank lines separate blocks; list markers start lists. */
export function parseRichText(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];

  for (const chunk of text.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;

    const isBullet = lines.every((line) => BULLET.test(line));
    const isNumbered = lines.every((line) => NUMBERED.test(line));

    if (isBullet || isNumbered) {
      blocks.push({
        kind: "list",
        ordered: isNumbered,
        items: lines.map((line) => parseInline(line.replace(isBullet ? BULLET : NUMBERED, ""))),
      });
    } else {
      blocks.push({ kind: "paragraph", lines: lines.map((line) => parseInline(line.trim())) });
    }
  }

  return blocks;
}

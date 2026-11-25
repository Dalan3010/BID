import { Fragment } from "react";

import { parseRichText, type InlineSegment } from "@/lib/rich-text";

/**
 * Citation rendering v1: the coach cites the source that backs a fact as a
 * plain URL inside its answer. Those URLs render as links — nothing fancier:
 * no markdown, no titles the coach did not write.
 */

/** Only these become links; anything else stays text, never an error. */
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"()]+/g;

/** A URL that ends a sentence keeps its punctuation out of the link. */
function trimUrl(url: string): string {
  return url.replace(/[.,;:!?]+$/, "");
}

/** Splits one run of text into plain parts and URL parts. */
function splitLinks(text: string): Array<{ text: string; url?: string }> {
  const parts: Array<{ text: string; url?: string }> = [];
  let last = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    const start = match.index ?? 0;
    const end = start + url.length;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: url, url });
    last = end;
  }

  if (last < text.length) parts.push({ text: text.slice(last) });

  return parts;
}

/** Renders the coach's text as paragraphs and lists, never as raw HTML. */
export function RichText({ text }: { text: string }) {
  const blocks = parseRichText(text);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) =>
        block.kind === "paragraph" ? (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <Inline segments={line} />
              </Fragment>
            ))}
          </p>
        ) : block.ordered ? (
          <ol key={index} className="ml-5 list-decimal space-y-1.5 marker:text-stone">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inline segments={item} />
              </li>
            ))}
          </ol>
        ) : (
          <ul key={index} className="ml-5 list-disc space-y-1.5 marker:text-bronze">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inline segments={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function Inline({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.strong ? (
          <strong key={index} className="font-medium text-paper">
            <WithLinks text={segment.text} />
          </strong>
        ) : (
          <WithLinks key={index} text={segment.text} />
        ),
      )}
    </>
  );
}

/** The same text, with its URLs as links. */
function WithLinks({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((part, index) =>
        part.url ? (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noreferrer noopener"
            className="break-all text-paper underline decoration-line-strong underline-offset-4 transition-colors duration-300 hover:decoration-bronze"
          >
            {part.url}
          </a>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

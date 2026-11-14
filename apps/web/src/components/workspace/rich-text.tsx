import { Fragment } from "react";

import { parseRichText, type InlineSegment } from "@/lib/rich-text";

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
            {segment.text}
          </strong>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

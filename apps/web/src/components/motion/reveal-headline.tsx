import { Fragment, createElement, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { parseWords } from "@/lib/headline";

/**
 * A headline revealed word by word.
 *
 * The words are rendered by React (not split by Anime.js at runtime), so the
 * DOM React owns never changes under its feet and the text is complete and
 * readable before any script runs. Each word sits in an overflow-hidden mask;
 * `useCinematicEntrance` lifts the inner span (`data-enter="word"`).
 *
 * Write accent words between asterisks to set them in the editorial serif
 * italic: `"Las ideas merecen un *lugar*"`.
 */
export function RevealHeadline({
  text,
  as = "h1",
  className,
  accentClassName,
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
  accentClassName?: string;
}) {
  const words = parseWords(text);

  const content: ReactNode = words.map((word, index) => (
    <Fragment key={index}>
      <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
        <span
          data-enter="word"
          className={cn(
            "inline-block",
            word.accent && "font-serif font-normal italic tracking-[-0.01em]",
            word.accent && accentClassName,
          )}
        >
          {word.text}
        </span>
      </span>
      {index < words.length - 1 ? " " : null}
    </Fragment>
  ));

  return createElement(as, { className }, content);
}

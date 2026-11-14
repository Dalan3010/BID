"use client";

import { animate, stagger } from "animejs";
import { useRef } from "react";

import { useAnimeScope } from "@/components/motion/use-anime-scope";
import { EASE } from "@/lib/motion";

/**
 * "Pensando contigo…" — three hairlines that breathe in sequence while the
 * coach prepares an answer or the extraction reads the conversation.
 *
 * The label is a polite live region; the animation is decorative and stops
 * (the scope is reverted) as soon as the indicator unmounts.
 */
export function ThinkingIndicator({ label }: { label: string }) {
  const root = useRef<HTMLDivElement>(null);

  useAnimeScope(root, () => {
    const bars = root.current?.querySelectorAll<HTMLElement>("[data-bar]");
    if (!bars?.length) return;
    animate(bars, {
      scaleY: [0.35, 1],
      opacity: [0.35, 1],
      duration: 620,
      ease: EASE.drift,
      delay: stagger(140),
      loop: true,
      alternate: true,
    });
  });

  return (
    <div ref={root} role="status" className="flex items-center gap-3 text-[0.8125rem] text-mist">
      <span aria-hidden="true" className="flex h-3.5 items-center gap-[3px]">
        {[0, 1, 2].map((bar) => (
          <span key={bar} data-bar className="h-full w-px origin-center bg-bronze" />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}

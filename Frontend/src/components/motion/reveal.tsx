"use client";

import { animate, stagger, utils } from "animejs";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";

import { useAnimeScope } from "./use-anime-scope";

/**
 * Reveals content when it enters the viewport.
 *
 * Children marked `data-reveal` (or the wrapper itself when none are) rise
 * and fade in, staggered, the first time they become visible. It uses an
 * `IntersectionObserver` as the trigger because content may live inside any
 * scroll container (the plan panel, a list), and Anime.js for the motion.
 *
 * Items are hidden by the script on mount, never by CSS: without JavaScript,
 * or with reduced motion, the content is simply there.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  deps = [],
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "ul" | "ol";
  /** Re-run when the list of items changes (e.g. data arrived). */
  deps?: readonly unknown[];
}) {
  const root = useRef<HTMLElement>(null);

  useAnimeScope(
    root,
    () => {
      const element = root.current;
      if (!element) return;

      const marked = Array.from(element.querySelectorAll<HTMLElement>("[data-reveal]"));
      const items = marked.length > 0 ? marked : [element];
      const pending = new Set(items);

      utils.set(items, { opacity: 0, y: 24 });

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => entry.target as HTMLElement)
            .filter((target) => pending.has(target));

          if (visible.length === 0) return;

          visible.forEach((target) => {
            pending.delete(target);
            observer.unobserve(target);
          });

          animate(visible, {
            opacity: [0, 1],
            y: [24, 0],
            duration: DURATION.block,
            ease: EASE.enter,
            delay: stagger(70),
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
      );

      items.forEach((item) => observer.observe(item));

      return () => observer.disconnect();
    },
    deps,
  );

  return (
    // The ref type is widened on purpose: the tag is chosen by the caller.
    <Tag ref={root as never} className={cn(className)}>
      {children}
    </Tag>
  );
}

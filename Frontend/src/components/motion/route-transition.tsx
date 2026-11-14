"use client";

import { animate } from "animejs";
import { useRef, type ReactNode } from "react";

import { EASE } from "@/lib/motion";

import { useAnimeScope } from "./use-anime-scope";

/**
 * A soft fade-and-rise when a route segment mounts.
 *
 * Used from `template.tsx`, which Next.js re-mounts on every navigation, so
 * moving between sections feels continuous while navigation stays the normal
 * App Router navigation (links, prefetching, back button).
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useAnimeScope(root, () => {
    const element = root.current;
    if (!element) return;
    animate(element, {
      opacity: [0, 1],
      y: [10, 0],
      duration: 650,
      ease: EASE.enter,
      // A leftover transform would make this wrapper the containing block of
      // every `position: fixed` descendant (menus, sheets). Clear it.
      onComplete: () => {
        element.style.removeProperty("transform");
      },
    });
  });

  return (
    <div ref={root} className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}

"use client";

import { createTimeline, stagger, type AnimationParams } from "animejs";
import type { RefObject } from "react";

import { DURATION, EASE } from "@/lib/motion";

import { useAnimeScope } from "./use-anime-scope";

/**
 * The cinematic entrance shared by every screen.
 *
 * Elements opt in with a `data-enter` attribute; the timeline reveals them in a
 * fixed narrative order, each step overlapping the previous one:
 *
 * 1. `backdrop` — the dark ground fades in.
 * 2. `photo`    — the photograph settles from a slight zoom.
 * 3. `nav`      — navigation items appear one after another.
 * 4. `word`     — the headline rises word by word (see `RevealHeadline`).
 * 5. `lede`     — the subtitle follows.
 * 6. `action`   — buttons arrive with a small vertical offset.
 * 7. `block`    — any other content block, staggered.
 *
 * Missing steps are skipped, so a screen only marks what it has. Pre-hidden
 * states live in CSS (`[data-motion="on"] [data-enter]`) to avoid a flash.
 */
export function useCinematicEntrance<T extends HTMLElement>(
  root: RefObject<T | null>,
  deps: readonly unknown[] = [],
) {
  useAnimeScope(
    root,
    () => {
      const element = root.current;
      if (!element) return;

      const pick = (step: string) =>
        Array.from(element.querySelectorAll<HTMLElement>(`[data-enter="${step}"]`));

      const timeline = createTimeline({
        defaults: { ease: EASE.enter, duration: DURATION.block },
      });

      const steps: Array<{
        step: string;
        params: AnimationParams;
        at: string | number;
      }> = [
        { step: "backdrop", params: { opacity: [0, 1], duration: 700, ease: "linear" }, at: 0 },
        {
          step: "photo",
          params: { opacity: [0, 1], scale: [1.08, 1], duration: DURATION.photo },
          at: 120,
        },
        {
          step: "nav",
          params: { opacity: [0, 1], y: [-8, 0], delay: stagger(70) },
          at: 520,
        },
        {
          step: "word",
          params: {
            opacity: [0, 1],
            y: ["105%", "0%"],
            duration: DURATION.headline,
            delay: stagger(65),
          },
          at: 640,
        },
        { step: "lede", params: { opacity: [0, 1], y: [14, 0] }, at: "-=820" },
        {
          step: "action",
          params: { opacity: [0, 1], y: [14, 0], delay: stagger(90) },
          at: "-=640",
        },
        {
          step: "block",
          params: { opacity: [0, 1], y: [22, 0], delay: stagger(80) },
          at: "-=600",
        },
      ];

      for (const { step, params, at } of steps) {
        const targets = pick(step);
        if (targets.length > 0) {
          timeline.add(targets, params, at);
        }
      }
    },
    deps,
  );
}

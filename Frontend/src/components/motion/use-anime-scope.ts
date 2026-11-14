"use client";

import { createScope, type Scope } from "animejs";
import { useEffect, useRef, type DependencyList, type RefObject } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/**
 * The single integration point between React and Anime.js.
 *
 * - The animations are created inside an Anime.js `Scope` rooted at `root`, so
 *   selectors only match inside the component.
 * - The scope is reverted on unmount (and when `deps` change): every animation,
 *   timer and inline style it created is cleaned up.
 * - With `prefers-reduced-motion`, `setup` is skipped entirely. The CSS keeps
 *   content visible in that case (see `globals.css`, `data-motion`).
 * - It runs in `useEffect`, so it is client-only and never blocks rendering or
 *   data loading.
 *
 * @returns a ref to the live scope, for calling methods registered with
 *   `scope.add("name", fn)` from event handlers.
 */
export function useAnimeScope<T extends HTMLElement>(
  root: RefObject<T | null>,
  setup: (scope: Scope) => void | (() => void),
  deps: DependencyList = [],
): RefObject<Scope | null> {
  const scope = useRef<Scope | null>(null);
  const setupRef = useRef(setup);

  useEffect(() => {
    setupRef.current = setup;
  });

  useEffect(() => {
    if (!root.current || prefersReducedMotion()) {
      return;
    }

    scope.current = createScope({ root }).add((self) => {
      if (self) return setupRef.current(self);
    });

    return () => {
      scope.current?.revert();
      scope.current = null;
    };
    // `deps` is the caller's contract, like any effect hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}

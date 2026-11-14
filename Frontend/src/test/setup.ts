/**
 * Setup for component tests (files `*.test.tsx`, run in jsdom).
 *
 * - `matchMedia` does not exist in jsdom. It is stubbed to report
 *   `prefers-reduced-motion: reduce`, so `useAnimeScope` skips every animation
 *   and tests assert on final states only.
 * - The DOM is cleaned after each test, and `localStorage` emptied, so tests
 *   never leak drafts or tour flags into each other.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });
}

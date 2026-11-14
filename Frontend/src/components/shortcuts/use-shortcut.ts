"use client";

import { useEffect, useRef } from "react";

import { isTypingTarget, matchesShortcut, type ShortcutSpec } from "@/lib/shortcuts";

/**
 * Runs `handler` when the combination is pressed anywhere on the page.
 *
 * - Ignored while typing in a field, unless `whileTyping` (used for Alt+digit
 *   and Escape, which are not text).
 * - Ignored while a modal `<dialog>` is open: the dialog owns the keyboard.
 * - The latest `handler` is always used without re-subscribing.
 */
export function useShortcut(
  spec: ShortcutSpec,
  handler: (event: KeyboardEvent) => void,
  { enabled = true, whileTyping = false }: { enabled?: boolean; whileTyping?: boolean } = {},
) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  const { key, code, alt } = spec;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing) return;
      if (!matchesShortcut(event, { key, code, alt })) return;
      if (!whileTyping && isTypingTarget(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      handlerRef.current(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, whileTyping, key, code, alt]);
}

"use client";

import { useEffect, useState } from "react";

/**
 * Copies a text to the clipboard and confirms it for two seconds.
 *
 * The confirmation is a polite live region, so screen readers hear "Copiado".
 * If the clipboard is unavailable (insecure context, denied permission) it
 * says so instead of failing silently.
 */
export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="eyebrow inline-flex min-h-6 items-center text-[0.625rem] text-stone transition-colors hover:text-paper"
    >
      <span aria-live="polite">
        {state === "copied" ? "Copiado" : state === "failed" ? "No se pudo copiar" : "Copiar"}
      </span>
    </button>
  );
}

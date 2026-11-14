"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the browser believes it is online.
 *
 * Subscribes to the `online` / `offline` events through
 * `useSyncExternalStore`, so every component reads the same value without an
 * effect. On the server it reports online (nothing to warn about there).
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

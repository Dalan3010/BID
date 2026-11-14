/**
 * The workspace's guided tour: its steps and whether it was already seen.
 *
 * Shown once per browser (a flag in `localStorage`); it can be replayed from
 * the workspace header ("Guía"). Nothing is sent to the API.
 */
import type { DraftStorage } from "./drafts";

/** One step of the tour. */
export interface TourStep {
  readonly title: string;
  readonly body: string;
  /** DOM id of the element to point at; `null` for a general step. */
  readonly target: string | null;
  /** Which workspace pane must be visible on small screens. */
  readonly pane: "conversation" | "plan";
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    title: "Conversa con tu coach",
    body: "Escribe con tus palabras. El coach te irá preguntando lo que falta, en el orden en que importa.",
    target: "composer",
    pane: "conversation",
  },
  {
    title: "Lo que hemos identificado",
    body: "Mientras conversan, el coach te propone piezas de tu negocio. Son propuestas: nada entra en tu plan hasta que lo confirmes, lo corrijas o lo descartes.",
    target: "propuestas",
    pane: "conversation",
  },
  {
    title: "Así va quedando tu plan",
    body: "Aquí ves las diez dimensiones de tu idea. Solo cuenta lo que tú validaste, y siempre puedes ver de qué mensaje salió cada dato.",
    target: "pane-plan",
    pane: "plan",
  },
];

const KEY = "bid:tour:workspace";

function browserStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** True once the tour was finished or skipped in this browser. */
export function hasSeenTour(storage = browserStorage()): boolean {
  try {
    return storage?.getItem(KEY) === "1";
  } catch {
    // Unreadable storage: do not insist on a tour that could never be dismissed.
    return true;
  }
}

/** Remembers that the tour was seen. */
export function markTourSeen(storage = browserStorage()): void {
  try {
    storage?.setItem(KEY, "1");
  } catch {
    // Not persisted: the tour may appear again next time, which is harmless.
  }
}

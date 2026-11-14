/**
 * Unsent drafts, one per idea, kept in the browser.
 *
 * If the person writes something and leaves the workspace without sending it,
 * the text is there when they come back. It lives in `localStorage` only: it
 * is never sent anywhere until the person presses "Enviar", and it is removed
 * once the API has stored the message.
 *
 * The storage is injectable so the logic is testable without a browser, and
 * every access is guarded: private mode or a full quota must never break the
 * composer.
 */

/** The subset of `Storage` this module needs. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = "bid:draft:";

/** Storage key of an idea's draft. */
export function draftKey(ideaId: string): string {
  return `${PREFIX}${ideaId}`;
}

function browserStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The saved draft, or "" when there is none or storage is unavailable. */
export function readDraft(ideaId: string, storage = browserStorage()): string {
  try {
    return storage?.getItem(draftKey(ideaId)) ?? "";
  } catch {
    return "";
  }
}

/** Saves the draft; an empty or blank text removes it. */
export function writeDraft(ideaId: string, text: string, storage = browserStorage()): void {
  try {
    if (text.trim()) storage?.setItem(draftKey(ideaId), text);
    else storage?.removeItem(draftKey(ideaId));
  } catch {
    // Quota or privacy mode: the draft just is not persisted.
  }
}

/** Forgets the draft (after the API stored the message). */
export function clearDraft(ideaId: string, storage = browserStorage()): void {
  writeDraft(ideaId, "", storage);
}

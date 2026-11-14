import { describe, expect, it } from "vitest";

import { clearDraft, draftKey, readDraft, writeDraft, type DraftStorage } from "./drafts";

function memoryStorage(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("drafts", () => {
  it("keeps one draft per idea", () => {
    const storage = memoryStorage();
    writeDraft("a", "hola", storage);
    writeDraft("b", "otra", storage);

    expect(readDraft("a", storage)).toBe("hola");
    expect(readDraft("b", storage)).toBe("otra");
    expect(storage.data.has(draftKey("a"))).toBe(true);
  });

  it("removes the draft when it becomes blank or is cleared", () => {
    const storage = memoryStorage();
    writeDraft("a", "hola", storage);
    writeDraft("a", "   ", storage);
    expect(storage.data.size).toBe(0);

    writeDraft("a", "hola", storage);
    clearDraft("a", storage);
    expect(readDraft("a", storage)).toBe("");
  });

  it("never throws when storage fails", () => {
    const broken: DraftStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };

    expect(readDraft("a", broken)).toBe("");
    expect(() => writeDraft("a", "x", broken)).not.toThrow();
  });
});

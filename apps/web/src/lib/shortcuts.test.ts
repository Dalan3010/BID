import { describe, expect, it } from "vitest";

import { matchesShortcut, type KeyLike } from "./shortcuts";

const key = (overrides: Partial<KeyLike>): KeyLike => ({
  key: "",
  code: "",
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...overrides,
});

describe("matchesShortcut", () => {
  it("matches a single key, ignoring case", () => {
    expect(matchesShortcut(key({ key: "N" }), { key: "n" })).toBe(true);
    expect(matchesShortcut(key({ key: "m" }), { key: "n" })).toBe(false);
  });

  it("requires Alt exactly when asked", () => {
    expect(matchesShortcut(key({ key: "n", altKey: true }), { key: "n" })).toBe(false);
    expect(matchesShortcut(key({ code: "Digit1", key: "¡", altKey: true }), { code: "Digit1", alt: true })).toBe(true);
    expect(matchesShortcut(key({ code: "Digit1", key: "1" }), { code: "Digit1", alt: true })).toBe(false);
  });

  it("never steals browser shortcuts with Ctrl or Cmd", () => {
    expect(matchesShortcut(key({ key: "n", ctrlKey: true }), { key: "n" })).toBe(false);
    expect(matchesShortcut(key({ key: "/", metaKey: true }), { key: "/" })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { coverFor } from "./covers";
import { firstName, formatRelative, plural, toPercent } from "./format";
import { parseWords, plainText } from "./headline";
import { parseInline, parseRichText } from "./rich-text";
import { safeNextPath } from "./session";

describe("headline", () => {
  it("marks the words between asterisks as accents", () => {
    const words = parseWords("Las ideas merecen un *lugar real*.");

    expect(words.map((word) => word.text)).toEqual(["Las", "ideas", "merecen", "un", "lugar", "real."]);
    expect(words.filter((word) => word.accent).map((word) => word.text)).toEqual(["lugar", "real."]);
    expect(plainText("un *lugar*")).toBe("un lugar");
  });
});

describe("rich text", () => {
  it("splits paragraphs and lists", () => {
    const blocks = parseRichText("Hola.\n\n- uno\n- dos\n\n1. a\n2. b");

    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "list", "list"]);
    expect(blocks[2]).toMatchObject({ kind: "list", ordered: true });
  });

  it("reads bold runs and leaves unmatched markers as text", () => {
    expect(parseInline("un **dato** clave")).toEqual([
      { text: "un ", strong: false },
      { text: "dato", strong: true },
      { text: " clave", strong: false },
    ]);
    expect(parseInline("2 ** 3")).toEqual([{ text: "2 ** 3", strong: false }]);
  });
});

describe("format", () => {
  const now = new Date("2026-11-07T12:00:00.000Z");

  it("speaks in relative time up to a week", () => {
    expect(formatRelative("2026-11-07T11:59:30.000Z", now)).toBe("hace un momento");
    expect(formatRelative("2026-11-07T11:30:00.000Z", now)).toBe("hace 30 min");
    expect(formatRelative("2026-11-06T12:00:00.000Z", now)).toBe("ayer");
    expect(formatRelative("2026-11-03T12:00:00.000Z", now)).toBe("hace 4 días");
  });

  it("clamps percentages and pluralizes", () => {
    expect(toPercent(0.7)).toBe(70);
    expect(toPercent(1.4)).toBe(100);
    expect(toPercent(Number.NaN)).toBe(0);
    expect(plural(1, "idea", "ideas")).toBe("1 idea");
    expect(plural(3, "idea", "ideas")).toBe("3 ideas");
    expect(firstName("  Ana María López ")).toBe("Ana");
  });
});

describe("navigation safety", () => {
  it("only follows in-app paths after sign-in", () => {
    expect(safeNextPath("/ideas/1")).toBe("/ideas/1");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});

describe("covers", () => {
  it("is stable for the same id", () => {
    expect(coverFor("abc")).toBe(coverFor("abc"));
    expect(coverFor("abc")).toMatch(/^\/images\/.+\.jpg$/);
  });
});

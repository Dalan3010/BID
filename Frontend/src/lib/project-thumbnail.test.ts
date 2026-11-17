import { describe, expect, it } from "vitest";

import {
  MATERIAL_LABEL,
  THUMBNAIL_MATERIALS,
  materialFor,
  monogramFor,
} from "./project-thumbnail";

describe("project thumbnail material", () => {
  it("is stable for the same id", () => {
    expect(materialFor("abc")).toBe(materialFor("abc"));
  });

  it("reaches every material across a list of ids", () => {
    const seen = new Set(
      Array.from({ length: 64 }, (_, index) => materialFor(`idea-${index}`)),
    );
    expect(seen.size).toBe(THUMBNAIL_MATERIALS.length);
  });

  it("labels every material", () => {
    for (const material of THUMBNAIL_MATERIALS) {
      expect(MATERIAL_LABEL[material]).toMatch(/\S/);
    }
  });
});

describe("project thumbnail monogram", () => {
  it("uses the first letter of the title", () => {
    expect(monogramFor("Brasa")).toBe("B");
  });

  it("skips punctuation and keeps accents", () => {
    expect(monogramFor("  «óptica» de barrio ")).toBe("Ó");
  });

  it("falls back to a dot when there is no letter", () => {
    expect(monogramFor("")).toBe("·");
    expect(monogramFor("   ")).toBe("·");
    expect(monogramFor("«»")).toBe("·");
  });

  it("accepts a title that starts with a digit", () => {
    expect(monogramFor("3 formas de vender")).toBe("3");
  });
});

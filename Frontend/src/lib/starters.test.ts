import { NODE_TYPES, type NodeType } from "@bid/core";
import { describe, expect, it } from "vitest";

import { DIMENSIONS } from "./dimensions";

/**
 * Contract check: every welcome starter must be recognizable by the scripted
 * extractor, or picking a topic would produce a proposal for the wrong
 * dimension (or none).
 *
 * The client may not import from `apps/api`, so these are COPIES of one
 * pattern per dimension from
 * `apps/api/src/infrastructure/ai/rehearsal-extractor.ts`.
 * If those patterns change, update this list.
 */
const EXTRACTOR_PATTERN: Readonly<Record<NodeType, RegExp>> = {
  problem: /el problema (?:es|era)/i,
  segment: /(?:mis |para )clientes? (?:son|:)/i,
  value_proposition: /la ventaja (?:es|de)/i,
  solution: /(?:vendo|ofrezco|entrego|construyo|creo) /i,
  channels: /(?:vendo|vendemos) (?:por|mediante)/i,
  revenue: /(?:cobra|cobro|precio|cuesta|mensual|por mes|suscrip)/i,
  costs: /(?:cuesta|cost(?:ea|os)|gasto|gastos)/i,
  competition: /(?:competencia|competidores|rivales)/i,
  metrics: /quiero (?:saber|medir)/i,
  risks: /(?:riesgo|me preocupa|preocupa|peligro)/i,
};

describe("welcome starters", () => {
  it.each([...NODE_TYPES])("%s starter is recognized by the extractor", (type) => {
    expect(DIMENSIONS[type].starter).toMatch(EXTRACTOR_PATTERN[type]);
  });
});

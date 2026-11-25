import { describe, expect, it } from "vitest";

import { parseStepPlan } from "./step-proposal-schema";

describe("parseStepPlan", () => {
  it("parses a valid plan", () => {
    const raw = JSON.stringify({
      steps: [
        { title: "Conseguir tres clientes de prueba" },
        { title: "Fijar el primer precio", detail: "Un número cobrable mañana." },
      ],
    });

    expect(parseStepPlan(raw)).toEqual({
      steps: [
        { title: "Conseguir tres clientes de prueba" },
        { title: "Fijar el primer precio", detail: "Un número cobrable mañana." },
      ],
    });
  });

  it("tolerates JSON wrapped in a code fence", () => {
    const raw = '```json\n{"steps":[{"title":"Llamar a dos proveedores"}]}\n```';

    expect(parseStepPlan(raw)?.steps[0]?.title).toBe("Llamar a dos proveedores");
  });

  it("discards an empty plan", () => {
    expect(parseStepPlan(JSON.stringify({ steps: [] }))).toBeNull();
  });

  it("discards a plan with too many steps", () => {
    const steps = Array.from({ length: 9 }, () => ({ title: "Paso" }));
    expect(parseStepPlan(JSON.stringify({ steps }))).toBeNull();
  });

  it("discards a step without a title", () => {
    expect(parseStepPlan(JSON.stringify({ steps: [{ title: "" }] }))).toBeNull();
  });

  it("discards text that is not JSON at all", () => {
    expect(parseStepPlan("No pude pensar en pasos, disculpa.")).toBeNull();
  });
});

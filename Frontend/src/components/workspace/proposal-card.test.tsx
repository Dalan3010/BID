// @vitest-environment jsdom
import type { IdeaNode } from "@bid/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProposalCard } from "./proposal-card";

const node: IdeaNode = {
  id: "n1",
  ideaId: "idea",
  type: "revenue",
  content: "Suscripción mensual de 30",
  source: "inferred",
  messageId: null,
  confidence: 0.8,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function setup(overrides: Partial<Parameters<typeof ProposalCard>[0]> = {}) {
  const props = {
    node,
    request: undefined,
    fresh: false,
    index: 0,
    onDecide: vi.fn(async () => {}),
    onDiscard: vi.fn(),
    onUndoDiscard: vi.fn(),
    ...overrides,
  };
  render(
    <ul>
      <ProposalCard {...props} />
    </ul>,
  );
  return props;
}

describe("ProposalCard", () => {
  it("shows what the coach identified, as pending, with its confidence", () => {
    setup();
    expect(screen.getByText("Suscripción mensual de 30")).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText(/Confianza del coach: 80%/)).toBeTruthy();
  });

  it("accepts through onDecide, never on its own", async () => {
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: "Sí, añadir al plan" }));
    expect(props.onDecide).toHaveBeenCalledWith(node, "accept");
  });

  it("sends the person's corrected text", async () => {
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: "Corregir" }));
    const box = screen.getByRole("textbox");
    await userEvent.clear(box);
    await userEvent.type(box, "  Cobro 25 al mes  ");
    await userEvent.click(screen.getByRole("button", { name: "Guardar mi versión" }));
    expect(props.onDecide).toHaveBeenCalledWith(node, "correct", "Cobro 25 al mes");
  });

  it("starts the undo window instead of discarding immediately", async () => {
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(props.onDiscard).toHaveBeenCalledWith(node);
    expect(props.onDecide).not.toHaveBeenCalled();
  });

  it("offers Deshacer while the discard is pending", async () => {
    const props = setup({ discardingUntil: Date.now() + 5000 });
    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(props.onUndoDiscard).toHaveBeenCalledWith("n1");
    expect(screen.queryByRole("button", { name: "Sí, añadir al plan" })).toBeNull();
  });

  it("shows the API's error on the card", () => {
    setup({ request: { decision: "accept", error: "Ese cambio no está permitido." } });
    expect(screen.getByRole("alert").textContent).toContain("Ese cambio no está permitido.");
  });
});

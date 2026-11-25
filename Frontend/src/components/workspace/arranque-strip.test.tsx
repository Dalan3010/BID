// @vitest-environment jsdom
import type { ArranqueStep } from "@bid/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArranqueStrip } from "./arranque-strip";
import { useArranqueSteps } from "./use-arranque-steps";

const { routerMock } = vi.hoisted(() => ({ routerMock: { replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    addArranqueSteps: vi.fn(),
    listArranqueSteps: vi.fn(),
    requestStepProposals: vi.fn(),
    updateArranqueStepStatus: vi.fn(),
  };
});

import {
  addArranqueSteps,
  listArranqueSteps,
  requestStepProposals,
  updateArranqueStepStatus,
} from "@/lib/api";

const step = (overrides: Partial<ArranqueStep> = {}): ArranqueStep => ({
  id: "s1",
  ideaId: "i1",
  title: "Buscar proveedores de café",
  detail: null,
  status: "open",
  createdAt: "2026-11-01T10:00:00.000Z",
  ...overrides,
});

/** The strip with the state the workspace owns. */
function Strip({ onShowPlan = () => undefined }: { onShowPlan?: () => void }) {
  const arranque = useArranqueSteps("i1");
  return <ArranqueStrip arranque={arranque} onShowPlan={onShowPlan} />;
}

beforeEach(() => {
  vi.mocked(listArranqueSteps).mockReset().mockResolvedValue([]);
  vi.mocked(requestStepProposals).mockReset();
  vi.mocked(addArranqueSteps).mockReset();
  vi.mocked(updateArranqueStepStatus).mockReset();
});

describe("ArranqueStrip — the conversation and the step list move together", () => {
  it("shows the step the coach is working on", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([
      step({ id: "s1", title: "Buscar proveedores de café" }),
      step({
        id: "s2",
        title: "Fijar el precio",
        createdAt: "2026-11-02T10:00:00.000Z",
      }),
    ]);

    render(<Strip />);

    expect(await screen.findByText("Buscar proveedores de café")).toBeDefined();
    expect(screen.getByText("Paso en curso")).toBeDefined();
    expect(screen.getByRole("button", { name: /Marcar como hecho/ })).toBeDefined();
  });

  it("closes the step from the chat and moves to the next one", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([
      step({ id: "s1", title: "Buscar proveedores de café" }),
      step({
        id: "s2",
        title: "Fijar el precio",
        createdAt: "2026-11-02T10:00:00.000Z",
      }),
    ]);
    vi.mocked(updateArranqueStepStatus).mockResolvedValue(
      step({ id: "s1", title: "Buscar proveedores de café", status: "done" }),
    );

    render(<Strip />);

    await userEvent.click(await screen.findByRole("button", { name: /Marcar como hecho/ }));

    expect(updateArranqueStepStatus).toHaveBeenCalledWith("i1", "s1", "done");
    expect(await screen.findByText("Fijar el precio")).toBeDefined();
    expect(screen.queryByText("Buscar proveedores de café")).toBeNull();
  });

  it("asks for the first steps without moving the person out of the chat", async () => {
    const onShowPlan = vi.fn();
    vi.mocked(requestStepProposals).mockResolvedValue({ kind: "ok", proposals: [] });

    render(<Strip onShowPlan={onShowPlan} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Pedir pasos al coach/ }),
    );

    await waitFor(() => expect(requestStepProposals).toHaveBeenCalledWith("i1"));
    // Switching panes hides the conversation on a narrow screen: the chat
    // looked broken right after asking for steps.
    expect(onShowPlan).not.toHaveBeenCalled();
  });

  it("shows the proposals in the chat and adds the one the person accepts", async () => {
    const onShowPlan = vi.fn();
    vi.mocked(requestStepProposals).mockResolvedValue({
      kind: "ok",
      proposals: [{ title: "Fijar el precio", detail: null }],
    });
    vi.mocked(addArranqueSteps).mockResolvedValue([
      step({ id: "s1", title: "Fijar el precio" }),
    ]);

    render(<Strip onShowPlan={onShowPlan} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Pedir pasos al coach/ }),
    );

    const add = await screen.findByRole("button", { name: /Añadir al arranque: Fijar el precio/ });
    expect(onShowPlan).not.toHaveBeenCalled();

    await userEvent.click(add);

    await waitFor(() =>
      expect(addArranqueSteps).toHaveBeenCalledWith("i1", [{ title: "Fijar el precio" }]),
    );
    expect(await screen.findByText("Paso en curso")).toBeDefined();
  });

  it("says nothing while the steps are still loading", () => {
    vi.mocked(listArranqueSteps).mockReturnValue(new Promise(() => undefined));

    const { container } = render(<Strip />);

    expect(container.textContent).toBe("");
  });
});

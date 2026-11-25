// @vitest-environment jsdom
import type { ArranqueStep } from "@bid/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArranquePanel } from "./arranque-panel";
import { useArranqueSteps } from "./use-arranque-steps";

/** The panel with its own state, mounted the way the workspace mounts it. */
function ArranqueSection({ ideaId }: { ideaId: string }) {
  const arranque = useArranqueSteps(ideaId);
  return <ArranquePanel arranque={arranque} />;
}

// One stable router for the whole file: a fresh object per render would make
// the hook's callbacks change identity and re-trigger its load effect.
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
  ApiError,
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

beforeEach(() => {
  vi.mocked(listArranqueSteps).mockReset().mockResolvedValue([]);
  vi.mocked(addArranqueSteps).mockReset();
  vi.mocked(requestStepProposals).mockReset();
  vi.mocked(updateArranqueStepStatus).mockReset();
});

describe("ArranqueSection — the steps the coach and the person agreed on", () => {
  it("says who closes a step, until the first one is done", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([step({ id: "s1" })]);

    render(<ArranqueSection ideaId="i1" />);

    expect(await screen.findByText(/Los pasos los cierras tú/)).toBeDefined();
  });

  it("drops the reminder once a step is done", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([
      step({ id: "s1", status: "done" }),
      step({ id: "s2", createdAt: "2026-11-02T10:00:00.000Z" }),
    ]);

    render(<ArranqueSection ideaId="i1" />);

    await screen.findByText("s2", { exact: false }).catch(() => undefined);
    await waitFor(() =>
      expect(screen.queryByText(/Los pasos los cierras tú/)).toBeNull(),
    );
  });

  it("shows the steps in the order the API delivered, oldest first", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([
      step({ id: "s1", title: "Paso más antiguo", createdAt: "2026-11-01T10:00:00.000Z" }),
      step({ id: "s2", title: "Paso siguiente", createdAt: "2026-11-02T10:00:00.000Z" }),
      step({ id: "s3", title: "Paso hecho", status: "done", createdAt: "2026-11-03T10:00:00.000Z" }),
    ]);

    render(<ArranqueSection ideaId="i1" />);

    const rows = await screen.findAllByText(/^Paso /);
    expect(rows.map((row) => row.textContent)).toEqual([
      "Paso más antiguo",
      "Paso siguiente",
      "Paso hecho",
    ]);
  });

  it("marks only the first open step as the next one", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([
      step({ id: "s1", title: "Paso más antiguo" }),
      step({ id: "s2", title: "Paso siguiente", createdAt: "2026-11-02T10:00:00.000Z" }),
    ]);

    render(<ArranqueSection ideaId="i1" />);

    const first = await screen.findByText("Paso más antiguo");
    expect(screen.getAllByText("Siguiente")).toHaveLength(1);
    expect(within(first.closest("li") ?? first).getByText("Siguiente")).toBeTruthy();
    expect(
      within(screen.getByText("Paso siguiente").closest("li") as HTMLElement).queryByText("Siguiente"),
    ).toBeNull();
  });

  it("invites the person to ask the coach when there are no steps yet", async () => {
    render(<ArranqueSection ideaId="i1" />);

    expect(
      await screen.findByText(
        "El plan está validado. Ahora puedes arrancar: pide al coach los primeros pasos concretos para tu idea.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pedir pasos al coach" })).toBeTruthy();
  });

  it("proposes only when asked, and stores nothing by itself", async () => {
    vi.mocked(requestStepProposals).mockResolvedValue({
      kind: "ok",
      proposals: [{ title: "Definir el precio", detail: "Compara tres referencias del mercado." }],
    });

    render(<ArranqueSection ideaId="i1" />);
    await screen.findByText(/El plan está validado/);

    await userEvent.click(screen.getByRole("button", { name: "Pedir pasos al coach" }));

    expect(requestStepProposals).toHaveBeenCalledWith("i1");
    expect(await screen.findByText("Definir el precio")).toBeTruthy();
    expect(
      screen.getByText("Son propuestas, no pasos guardados: no entran en tu lista hasta que decidas."),
    ).toBeTruthy();
    expect(addArranqueSteps).not.toHaveBeenCalled();
  });

  it("stores a proposal only when the person accepts it, one at a time", async () => {
    vi.mocked(requestStepProposals).mockResolvedValue({
      kind: "ok",
      proposals: [
        { title: "Definir el precio", detail: null },
        { title: "Buscar proveedores", detail: "Tres opciones." },
      ],
    });
    vi.mocked(addArranqueSteps).mockResolvedValue([
      step({ id: "s9", title: "Definir el precio", createdAt: "2026-11-04T10:00:00.000Z" }),
    ]);

    render(<ArranqueSection ideaId="i1" />);
    await screen.findByText(/El plan está validado/);
    await userEvent.click(screen.getByRole("button", { name: "Pedir pasos al coach" }));
    const first = await screen.findByText("Definir el precio");

    await userEvent.click(within(first.closest("li") as HTMLElement).getByRole("button", { name: "Añadir al arranque" }));

    expect(addArranqueSteps).toHaveBeenCalledWith("i1", [{ title: "Definir el precio" }]);
    // The stored step joined the list; the other proposal is still waiting.
    expect(screen.getAllByText("Definir el precio")).toHaveLength(1);
    expect(screen.getByText("Buscar proveedores")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pedir pasos al coach" })).toBeNull();
  });

  it("removes a discarded proposal without any request", async () => {
    vi.mocked(requestStepProposals).mockResolvedValue({
      kind: "ok",
      proposals: [{ title: "Definir el precio", detail: null }],
    });

    render(<ArranqueSection ideaId="i1" />);
    await screen.findByText(/El plan está validado/);
    await userEvent.click(screen.getByRole("button", { name: "Pedir pasos al coach" }));
    const proposal = await screen.findByText("Definir el precio");

    await userEvent.click(within(proposal.closest("li") as HTMLElement).getByRole("button", { name: "Descartar" }));

    expect(screen.queryByText("Definir el precio")).toBeNull();
    expect(addArranqueSteps).not.toHaveBeenCalled();
  });

  it("shows the limit as a message, not as an error, when the quota is reached", async () => {
    vi.mocked(requestStepProposals).mockResolvedValue({ kind: "quota" });

    render(<ArranqueSection ideaId="i1" />);
    await screen.findByText(/El plan está validado/);
    await userEvent.click(screen.getByRole("button", { name: "Pedir pasos al coach" }));

    expect(
      await screen.findByText(
        "Llegaste al límite de propuestas disponibles. Puedes seguir conversando con el coach con normalidad.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(
      screen.queryByText(/Llegaste al límite de propuestas disponibles/),
    ).toBeNull();
    expect(addArranqueSteps).not.toHaveBeenCalled();
  });

  it("says when the coach proposed nothing this time", async () => {
    vi.mocked(requestStepProposals).mockResolvedValue({ kind: "ok", proposals: [] });

    render(<ArranqueSection ideaId="i1" />);
    await screen.findByText(/El plan está validado/);
    await userEvent.click(screen.getByRole("button", { name: "Pedir pasos al coach" }));

    expect(
      await screen.findByText(
        "Esta vez el coach no propuso pasos. Puedes pedírselo de nuevo más adelante.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("completes a step through the API, and opens it back", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([step({ id: "s1", title: "Paso abierto" })]);
    vi.mocked(updateArranqueStepStatus).mockResolvedValue(
      step({ id: "s1", title: "Paso abierto", status: "done" }),
    );

    render(<ArranqueSection ideaId="i1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como hecho" }));

    expect(updateArranqueStepStatus).toHaveBeenCalledWith("i1", "s1", "done");
    expect(await screen.findByRole("button", { name: "Abrir de nuevo" })).toBeTruthy();

    vi.mocked(updateArranqueStepStatus).mockResolvedValue(
      step({ id: "s1", title: "Paso abierto", status: "open" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Abrir de nuevo" }));

    expect(updateArranqueStepStatus).toHaveBeenCalledWith("i1", "s1", "open");
    expect(await screen.findByRole("button", { name: "Marcar como hecho" })).toBeTruthy();
  });

  it("shows the API's error on the step and keeps it unchanged", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([step({ id: "s1", title: "Paso abierto" })]);
    vi.mocked(updateArranqueStepStatus).mockRejectedValue(
      new ApiError(400, "Los datos no son válidos."),
    );

    render(<ArranqueSection ideaId="i1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como hecho" }));

    expect(await screen.findByText("Los datos no son válidos.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Marcar como hecho" })).toBeTruthy();
  });

  it("reloads the list when the step is no longer there", async () => {
    vi.mocked(listArranqueSteps).mockResolvedValue([step({ id: "s1", title: "Paso abierto" })]);
    vi.mocked(updateArranqueStepStatus).mockRejectedValue(
      new ApiError(404, "No encontramos ese paso."),
    );

    render(<ArranqueSection ideaId="i1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como hecho" }));

    await waitFor(() => expect(listArranqueSteps).toHaveBeenCalledTimes(2));
  });

  it("offers a retry when the list cannot be loaded", async () => {
    vi.mocked(listArranqueSteps)
      .mockRejectedValueOnce(new ApiError(502, "No pudimos cargar tus pasos."))
      .mockResolvedValue([step({ id: "s1", title: "Paso abierto" })]);

    render(<ArranqueSection ideaId="i1" />);

    expect(await screen.findByText("No pudimos cargar tus pasos.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Paso abierto")).toBeTruthy();
    expect(listArranqueSteps).toHaveBeenCalledTimes(2);
  });
});

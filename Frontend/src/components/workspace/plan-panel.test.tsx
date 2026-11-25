// @vitest-environment jsdom
import type { Idea } from "@bid/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PlanPanel } from "./plan-panel";

/**
 * The diagram is React Flow and cannot render in jsdom, but what matters here
 * is the height it is given: the panel's modest one, or the screen's when the
 * person asks to enlarge it.
 */
const { sizes } = vi.hoisted(() => ({ sizes: [] as (string | undefined)[] }));

// The panel loads the diagram with `next/dynamic`; the mock keeps it synchronous
// and records the height it was given.
vi.mock("next/dynamic", () => ({
  default: () =>
    function Tree({ heightClassName }: { heightClassName?: string }) {
      sizes.push(heightClassName);
      return <div data-testid="tree" />;
    },
}));

// jsdom does not implement the dialog's modal methods: the test only needs the
// `open` attribute they toggle.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void;
    close?: () => void;
  };
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  const domClose = proto.close;
  proto.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    domClose?.call(this);
  };
});

const idea: Idea = {
  id: "i1",
  title: "Café de especialidad",
  summary: "Café por suscripción para oficinas",
  ownerId: "u1",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

function renderPanel() {
  return render(
    <PlanPanel
      idea={idea}
      nodes={[]}
      highlight={null}
      onReview={() => undefined}
      onTrace={() => undefined}
      messages={[]}
    />,
  );
}

describe("PlanPanel — ver estructura técnica", () => {
  it("opens the hierarchy small, and enlarges it to the screen when asked", async () => {
    sizes.length = 0;
    renderPanel();

    const toggle = screen.getByRole("button", { name: /Ver estructura técnica/ });
    const dialog = document.querySelector("dialog");

    await userEvent.click(toggle);

    // Two diagrams: the one in the panel and the one waiting in the dialog.
    const trees = await screen.findAllByTestId("tree");
    expect(trees).toHaveLength(2);
    // The panel keeps its modest height; the dialog is closed.
    expect(sizes).toContain(undefined);
    expect(dialog?.hasAttribute("open")).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Ampliar" }));

    await waitFor(() => expect(dialog?.hasAttribute("open")).toBe(true));
    // The enlarged one takes the screen, which is the whole point.
    expect(sizes.at(-1)).toContain("100dvh");
  });
});

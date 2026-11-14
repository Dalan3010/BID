// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { isTypingTarget } from "@/lib/shortcuts";

import { IdeaFilters } from "./idea-filters";

describe("IdeaFilters", () => {
  it("reports the search and marks the active stage", async () => {
    const onQueryChange = vi.fn();
    const onStageChange = vi.fn();
    render(
      <IdeaFilters
        query=""
        onQueryChange={onQueryChange}
        stage="all"
        onStageChange={onStageChange}
        counts={{ all: 3, empty: 1, progress: 1, complete: 1 }}
      />,
    );

    await userEvent.type(screen.getByLabelText("Buscar ideas"), "c");
    expect(onQueryChange).toHaveBeenCalledWith("c");

    expect(screen.getByRole("button", { name: /Todas/ }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: /Completas/ }));
    expect(onStageChange).toHaveBeenCalledWith("complete");
  });

  it("is a typing target, so single-key shortcuts do not fire inside it", () => {
    render(
      <IdeaFilters query="" onQueryChange={vi.fn()} stage="all" onStageChange={vi.fn()} counts={{ all: 0, empty: 0, progress: 0, complete: 0 }} />,
    );
    expect(isTypingTarget(screen.getByLabelText("Buscar ideas"))).toBe(true);
    expect(isTypingTarget(screen.getByRole("button", { name: /Todas/ }))).toBe(false);
  });
});

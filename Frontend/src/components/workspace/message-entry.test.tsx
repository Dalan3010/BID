// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Attachment } from "@/lib/attachments";

import { MessageEntry } from "./message-entry";
import type { ConversationMessage } from "./use-workspace";

const image = (): Attachment => ({
  file: new File(["png"], "local.png", { type: "image/png" }),
  type: "image",
  name: "local.png",
  previewUrl: "blob:preview-1",
});

const pdf = (): Attachment => ({
  file: new File(["%PDF"], "plan.pdf", { type: "application/pdf" }),
  type: "pdf",
  name: "plan.pdf",
  previewUrl: "",
});

const message = (attachment: Attachment): ConversationMessage => ({
  id: "m1",
  role: "user",
  content: "Mira esto",
  createdAt: new Date("2026-11-16T10:00:00Z").toISOString(),
  attachment,
});

describe("MessageEntry attachment", () => {
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("URL", { ...URL, revokeObjectURL });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a sent image inside the bubble and frees it when it leaves", () => {
    const { unmount } = render(<MessageEntry message={message(image())} />);

    expect(screen.getByAltText("local.png")).toBeTruthy();
    expect(screen.getByText("Mira esto")).toBeTruthy();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });

  it("shows a sent PDF by name, without pretending to open it", () => {
    render(<MessageEntry message={message(pdf())} />);

    expect(screen.getByText("plan.pdf")).toBeTruthy();
    expect(screen.getByText("PDF")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});

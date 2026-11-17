// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ATTACHMENT_ACCEPT, attachmentFromFile, releaseAttachment } from "./attachments";

const pdf = () => new File(["%PDF-1.7"], "plan-de-negocio.pdf", { type: "application/pdf" });
const png = () => new File(["png"], "local.png", { type: "image/png" });

describe("attachments", () => {
  const createObjectURL = vi.fn(() => "blob:preview-1");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("accepts only images and PDFs in the file input", () => {
    expect(ATTACHMENT_ACCEPT).toBe("image/*,application/pdf");
  });

  it("reads an image, names it and creates its preview", () => {
    const attachment = attachmentFromFile(png());

    expect(attachment).toMatchObject({ type: "image", name: "local.png", previewUrl: "blob:preview-1" });
    expect(attachment?.file).toBeInstanceOf(File);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("reads a PDF without asking the browser for a preview", () => {
    const attachment = attachmentFromFile(pdf());

    expect(attachment).toMatchObject({ type: "pdf", name: "plan-de-negocio.pdf", previewUrl: "" });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects any other file type", () => {
    const docx = new File(["x"], "contrato.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(attachmentFromFile(docx)).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("frees the preview URL only when there is one", () => {
    releaseAttachment(attachmentFromFile(png()));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");

    revokeObjectURL.mockClear();
    releaseAttachment(attachmentFromFile(pdf()));
    releaseAttachment(null);
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});

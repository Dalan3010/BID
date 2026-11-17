// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Attachment } from "@/lib/attachments";
import { draftKey } from "@/lib/drafts";

import { Composer } from "./composer";

const field = () => screen.getByLabelText("Escribe tu mensaje al coach") as HTMLTextAreaElement;

describe("Composer", () => {
  it("sends the text with Enter and keeps Shift+Enter as a line break", async () => {
    const onSend = vi.fn(async () => true);
    render(<Composer ideaId="i1" phase="idle" onSend={onSend} />);

    await userEvent.type(field(), "Hola{Shift>}{Enter}{/Shift}mundo");
    expect(onSend).not.toHaveBeenCalled();
    expect(field().value).toBe("Hola\nmundo");

    await userEvent.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("Hola\nmundo", null);
    expect(field().value).toBe("");
  });

  it("gives the text back when the API did not store it", async () => {
    const onSend = vi.fn(async () => false);
    render(<Composer ideaId="i1" phase="idle" onSend={onSend} />);

    await userEvent.type(field(), "No se guardó{Enter}");
    expect(field().value).toBe("No se guardó");
  });

  it("cannot send while offline or while the coach answers", async () => {
    const { rerender } = render(<Composer ideaId="i1" phase="idle" onSend={vi.fn()} offline />);
    await userEvent.type(field(), "borrador");
    expect((screen.getByRole("button", { name: "Enviar mensaje" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<Composer ideaId="i1" phase="streaming" onSend={vi.fn()} />);
    expect(field().disabled).toBe(true);
  });

  it("restores and keeps the draft per idea", async () => {
    window.localStorage.setItem(draftKey("i1"), "lo que dejé a medias");
    render(<Composer ideaId="i1" phase="idle" onSend={vi.fn()} />);
    expect(field().value).toBe("lo que dejé a medias");

    await userEvent.type(field(), " y más");
    expect(window.localStorage.getItem(draftKey("i1"))).toBe("lo que dejé a medias y más");
  });

  it("prefills a seed from the coach's welcome", () => {
    render(<Composer ideaId="i1" phase="idle" onSend={vi.fn()} seed={{ text: "Mis clientes son ", at: 1 }} />);
    expect(field().value).toBe("Mis clientes son ");
  });
});

describe("Composer attachments", () => {
  const createObjectURL = vi.fn(() => "blob:preview-1");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    vi.clearAllMocks();
  });

  const fileInput = (container: HTMLElement) =>
    container.querySelector('input[type="file"]') as HTMLInputElement;

  const pick = (container: HTMLElement, file: File) =>
    fireEvent.change(fileInput(container), { target: { files: [file] } });

  const image = () => new File(["png"], "local.png", { type: "image/png" });
  const pdf = () => new File(["%PDF"], "plan.pdf", { type: "application/pdf" });
  const docx = () => new File(["x"], "contrato.docx", { type: "application/msword" });

  it("accepts strictly images and PDFs and previews an image", () => {
    const { container } = render(<Composer ideaId="i1" phase="idle" onSend={vi.fn(async () => true)} />);
    expect(fileInput(container).accept).toBe("image/*,application/pdf");

    pick(container, image());

    expect(screen.getByAltText("Vista previa de local.png")).toBeTruthy();
    expect(screen.getByText(/^Imagen · listo para enviar$/)).toBeTruthy();
  });

  it("shows a PDF as a document block with its name", () => {
    const { container } = render(<Composer ideaId="i1" phase="idle" onSend={vi.fn(async () => true)} />);

    pick(container, pdf());

    expect(screen.getByText("plan.pdf")).toBeTruthy();
    expect(screen.getByText(/^PDF · listo para enviar$/)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("ignores a type the chat cannot carry", () => {
    const { container } = render(<Composer ideaId="i1" phase="idle" onSend={vi.fn(async () => true)} />);

    pick(container, docx());

    expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("discards the attachment with its X and frees the preview URL", async () => {
    const { container } = render(<Composer ideaId="i1" phase="idle" onSend={vi.fn(async () => true)} />);
    pick(container, image());

    await userEvent.click(screen.getByRole("button", { name: "Quitar local.png" }));

    expect(screen.queryByAltText("Vista previa de local.png")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });

  it("sends text and attachment together, then clears both", async () => {
    const onSend = vi.fn<(content: string, attachment: Attachment | null) => Promise<boolean>>(
      async () => true,
    );
    const { container } = render(<Composer ideaId="i1" phase="idle" onSend={onSend} />);

    pick(container, pdf());
    await userEvent.type(field(), "Revisa este plan{Enter}");

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0][1]).toMatchObject({ type: "pdf", name: "plan.pdf" });
    expect(onSend.mock.calls[0][0]).toBe("Revisa este plan");
    expect(field().value).toBe("");
    expect(screen.queryByText("plan.pdf")).toBeNull();
  });

  it("can send an attachment without text", async () => {
    const onSend = vi.fn<(content: string, attachment: Attachment | null) => Promise<boolean>>(
      async () => true,
    );
    const { container } = render(<Composer ideaId="i1" phase="idle" onSend={onSend} />);

    pick(container, image());
    await userEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0][0]).toBe("");
  });

  it("gives the attachment back when the send was not accepted", async () => {
    const onSend = vi.fn(async () => false);
    const { container } = render(<Composer ideaId="i1" phase="idle" onSend={onSend} />);

    pick(container, pdf());
    await userEvent.type(field(), "Mira{Enter}");

    expect(screen.getByText("plan.pdf")).toBeTruthy();
    expect(field().value).toBe("Mira");
  });
});

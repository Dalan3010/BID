// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
    expect(onSend).toHaveBeenCalledWith("Hola\nmundo");
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

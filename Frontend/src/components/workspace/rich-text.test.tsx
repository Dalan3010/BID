// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RichText } from "./rich-text";

/**
 * Citation rendering v1: the coach may cite the source that backs a fact as a
 * plain URL inside its answer. Those URLs have to arrive as links, not as
 * text the person has to copy by hand.
 */
describe("RichText citations", () => {
  it("renders a URL in the coach's text as a link to its own address", () => {
    render(<RichText text="Puedes ver la guía en https://example.com/guias" />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://example.com/guias");
    expect(link.textContent).toBe("https://example.com/guias");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("keeps sentence punctuation out of the link", () => {
    render(<RichText text="Mira https://example.com/proveedores, y elige." />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://example.com/proveedores");
    expect(link.textContent).toBe("https://example.com/proveedores");
    // The sentence survives intact, punctuation included, around the link.
    expect(document.querySelector("p")?.textContent).toBe(
      "Mira https://example.com/proveedores, y elige.",
    );
  });

  it("leaves text without URLs as plain text", () => {
    render(<RichText text="No hay enlaces aquí." />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("No hay enlaces aquí.")).toBeTruthy();
  });

  it("links several URLs in one message", () => {
    render(<RichText text="Dos fuentes: https://a.com/uno y https://b.com/dos" />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://a.com/uno",
      "https://b.com/dos",
    ]);
  });

  it("links URLs inside bold text and inside list items", () => {
    render(
      <RichText
        text={"**Fuente: https://example.com/fuente**\n\n- Revisa https://example.com/otra"}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0].closest("strong")).not.toBeNull();
    expect(links[1].closest("li")).not.toBeNull();
  });
});

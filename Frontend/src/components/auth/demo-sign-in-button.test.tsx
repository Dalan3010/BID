// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInEmail, replace } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

vi.mock("@/lib/auth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-client")>();
  return { ...actual, signIn: { email: signInEmail } };
});

import { DemoSignInButton } from "./demo-sign-in-button";

beforeEach(() => {
  signInEmail.mockReset();
  replace.mockReset();
});

describe("DemoSignInButton", () => {
  it("explains the connection failure and re-enables the button when the API is down", async () => {
    // Without a reachable API, `fetch` rejects: there is no HTTP status, so the
    // component must not crash nor leave the button stuck in "Entrando…".
    signInEmail.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<DemoSignInButton />);
    await userEvent.click(screen.getByRole("button", { name: /cuenta demo/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/no pudimos conectar con el servidor/i);
    expect((screen.getByRole("button", { name: /cuenta demo/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the safe next path on success", async () => {
    signInEmail.mockResolvedValue({ error: null });

    render(<DemoSignInButton next="/ideas/1" />);
    await userEvent.click(screen.getByRole("button", { name: /cuenta demo/i }));

    expect(replace).toHaveBeenCalledWith("/ideas/1");
  });
});

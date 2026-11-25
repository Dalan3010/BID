// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_ACCOUNT } from "@/lib/config";

const { session, routerMock } = vi.hoisted(() => ({
  session: {
    current: null as null | {
      user: { id: string; name: string; email: string };
    },
  },
  routerMock: { refresh: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

// The entrance animation is not what this test is about, and it needs a DOM
// observer that jsdom does not provide.
vi.mock("@/components/motion/use-cinematic-entrance", () => ({
  useCinematicEntrance: () => {},
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: session.current, refetch: vi.fn() }),
  authClient: {
    updateUser: vi.fn(),
    changeEmail: vi.fn(),
    changePassword: vi.fn(),
    deleteUser: vi.fn(),
  },
  authErrorMessage: () => "",
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    resetDemo: vi.fn(),
    exportUrl: () => "/api/account/export",
  };
});

import { AccountView } from "./account-view";

function signIn(email: string, name = "Cuenta demo") {
  session.current = { user: { id: "user-1", name, email } };
}

beforeEach(() => {
  session.current = null;
});

/**
 * The demo account is shared and public, so its profile has no editable forms:
 * the only action left is resetting the demo. Any other account keeps them.
 */
describe("AccountView", () => {
  it("shows the demo account as read-only", () => {
    signIn(DEMO_ACCOUNT.email);

    render(<AccountView />);

    expect(
      screen.getByRole("heading", { name: "Cuenta demo" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Reiniciar la demo" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Perfil" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Correo" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Contraseña" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Eliminar la cuenta" }),
    ).toBeNull();
  });

  it("keeps the account forms for a normal account", () => {
    signIn("person@example.com", "Persona");

    render(<AccountView />);

    expect(screen.getByRole("heading", { name: "Perfil" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Correo" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Contraseña" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Eliminar la cuenta" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Cuenta demo" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Reiniciar la demo" }),
    ).toBeNull();
  });
});

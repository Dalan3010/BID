/**
 * Better Auth client.
 *
 * Authentication lives in the API (`/api/auth/*`): it issues an httpOnly
 * session cookie that JavaScript cannot read. This client only calls those
 * routes with credentials; it never stores a token.
 */
import { createAuthClient } from "better-auth/react";

import { API_URL } from "./config";

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: "include" },
});

export const { useSession, signIn, signUp, signOut } = authClient;

/**
 * Turns a Better Auth error into user copy.
 *
 * Better Auth returns English messages and stable codes; the UI speaks
 * Spanish, so the frequent codes are translated and the rest fall back to a
 * neutral sentence. A failed sign-in never says whether the email exists.
 */
export function authErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
): string {
  const code = error?.code ?? "";

  const known: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "El correo o la contraseña no coinciden.",
    INVALID_PASSWORD: "La contraseña no es correcta.",
    INVALID_EMAIL: "Ese correo no parece válido.",
    USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo.",
    PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
    PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
    INVALID_TOKEN: "El enlace no es válido o ya caducó. Pide uno nuevo.",
    TOKEN_EXPIRED: "El enlace caducó. Pide uno nuevo.",
    SESSION_EXPIRED: "Tu sesión caducó. Vuelve a entrar.",
    CREDENTIAL_ACCOUNT_NOT_FOUND: "Esta cuenta no tiene contraseña configurada.",
  };

  if (known[code]) return known[code];
  if (error?.status === 429) return "Demasiados intentos. Espera un momento.";
  if (!error) return "No pudimos conectar con el servidor.";

  return "No pudimos completar la operación. Inténtalo de nuevo.";
}

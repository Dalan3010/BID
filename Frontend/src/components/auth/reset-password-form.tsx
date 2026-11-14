"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authClient, authErrorMessage, CONNECTION_ERROR } from "@/lib/auth-client";

const MIN_PASSWORD = 8;

/**
 * Sets a new password with the one-time token from the reset link
 * (`/reset-password?token=…`, built by the API).
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (!token || linkError) {
    return (
      <div className="flex flex-col gap-6">
        <Alert tone="error" title="Enlace no válido">
          Este enlace no es válido o ya caducó. Los enlaces sirven una sola vez.
        </Alert>
        <Link href="/forgot-password" className="text-sm text-paper underline underline-offset-4">
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setFieldError(`Usa al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setFieldError("Las contraseñas no coinciden.");
      return;
    }
    setFieldError(null);
    setPending(true);

    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: password,
        token: token as string,
      });

      if (authError) {
        setPending(false);
        setError(authErrorMessage(authError));
        return;
      }

      router.replace("/sign-in?reset=ok");
    } catch {
      // The API is unreachable: `fetch` rejects before any HTTP status exists.
      setPending(false);
      setError(CONNECTION_ERROR);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="Contraseña nueva"
        type="password"
        name="new-password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
      />
      <TextField
        label="Repítela"
        type="password"
        name="confirm-password"
        autoComplete="new-password"
        required
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        error={fieldError}
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" size="lg" loading={pending} loadingLabel="Guardando…" className="mt-2">
        Guardar contraseña
      </Button>
    </form>
  );
}

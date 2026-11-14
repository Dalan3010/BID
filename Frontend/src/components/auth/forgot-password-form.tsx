"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authClient, authErrorMessage, CONNECTION_ERROR } from "@/lib/auth-client";

/**
 * Requests a password reset link (RF-04).
 *
 * The confirmation is the same whether or not the email exists, so the form
 * never reveals which addresses have an account. There is no mail provider
 * yet: the API writes the link to its log (`AUTH_LOG_SECRETS=1` in local
 * development to see the token).
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const { error: authError } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });

      setPending(false);

      // Only transport failures are surfaced; "no such account" is not.
      if (authError && (authError.status ?? 0) >= 500) {
        setError(authErrorMessage(authError));
        return;
      }

      setSent(true);
    } catch {
      // The API is unreachable: `fetch` rejects before any HTTP status exists.
      setPending(false);
      setError(CONNECTION_ERROR);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="Revisa tu correo">
          Si existe una cuenta con <strong className="font-medium">{email.trim()}</strong>, te
          enviamos un enlace para elegir una contraseña nueva.
        </Alert>
        <p className="text-[0.8125rem] leading-relaxed text-stone">
          En este entorno todavía no hay servicio de correo: el enlace se escribe en el registro
          del servidor de la API.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="Correo de tu cuenta"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="tu@correo.com"
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button type="submit" size="lg" loading={pending} loadingLabel="Enviando…" className="mt-2">
        Enviar enlace
      </Button>
    </form>
  );
}

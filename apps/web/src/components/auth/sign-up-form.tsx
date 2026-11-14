"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { ArrowIcon, Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authErrorMessage, signUp } from "@/lib/auth-client";
import { useRedirectIfSignedIn } from "@/lib/session";

/** Better Auth's default minimum; checked here only to fail fast. */
const MIN_PASSWORD = 8;

/** Self-service registration (RF-01). Better Auth signs the user in on success. */
export function SignUpForm() {
  const router = useRouter();
  useRedirectIfSignedIn(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setPasswordError(`Usa al menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setPasswordError(null);
    setPending(true);

    const { error: authError } = await signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    if (authError) {
      setPending(false);
      setError(authErrorMessage(authError));
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="Nombre"
        name="name"
        autoComplete="name"
        required
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Cómo quieres que te llamemos"
      />
      <TextField
        label="Correo"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="tu@correo.com"
      />
      <TextField
        label="Contraseña"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
        error={passwordError}
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Button type="submit" size="lg" loading={pending} loadingLabel="Creando tu estudio…" className="mt-2">
        Crear mi estudio
        <ArrowIcon />
      </Button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { ArrowIcon, Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authErrorMessage, signIn } from "@/lib/auth-client";
import { safeNextPath, useRedirectIfSignedIn } from "@/lib/session";

import { DemoSignInButton } from "./demo-sign-in-button";

/** Email + password sign-in through Better Auth, plus the demo shortcut. */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const resetDone = params.get("reset") === "ok";

  useRedirectIfSignedIn(next);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: authError } = await signIn.email({
      email: email.trim(),
      password,
    });

    if (authError) {
      setPending(false);
      setError(authErrorMessage(authError));
      return;
    }

    router.replace(safeNextPath(next));
  }

  return (
    <div className="flex flex-col gap-8">
      {resetDone ? (
        <Alert tone="success">Tu contraseña se actualizó. Ya puedes entrar.</Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aside={
            <Link
              href="/forgot-password"
              className="text-[0.8125rem] text-stone transition-colors hover:text-paper"
            >
              ¿La olvidaste?
            </Link>
          }
        />

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Button type="submit" size="lg" loading={pending} loadingLabel="Entrando…" className="mt-2">
          Entrar
          <ArrowIcon />
        </Button>
      </form>

      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="eyebrow text-stone">o</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-2">
        <DemoSignInButton next={next} className="w-full" />
        <p className="text-center text-[0.8125rem] text-stone">
          Explora una idea de ejemplo ya trabajada.
        </p>
      </div>
    </div>
  );
}

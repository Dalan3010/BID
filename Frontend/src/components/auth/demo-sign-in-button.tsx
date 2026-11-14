"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { authErrorMessage, CONNECTION_ERROR, signIn } from "@/lib/auth-client";
import { DEMO_ACCOUNT } from "@/lib/config";
import { safeNextPath } from "@/lib/session";

/**
 * Signs in with the seeded demo account in one click (RF-70).
 *
 * It is a normal Better Auth email sign-in with the public demo credentials:
 * no separate mechanism, same httpOnly cookie as any other account.
 */
export function DemoSignInButton({
  next,
  variant = "secondary",
  size = "md",
  className,
  label = "Entrar con la cuenta demo",
}: {
  next?: string | null;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter() {
    setPending(true);
    setError(null);

    try {
      const { error: authError } = await signIn.email({
        email: DEMO_ACCOUNT.email,
        password: DEMO_ACCOUNT.password,
      });

      if (authError) {
        setPending(false);
        setError(
          authError.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "La cuenta demo no está disponible. Ejecuta `pnpm db:seed` en el servidor."
            : authErrorMessage(authError),
        );
        return;
      }

      router.replace(safeNextPath(next));
    } catch {
      // The API is unreachable: `fetch` rejects before any HTTP status exists.
      setPending(false);
      setError(CONNECTION_ERROR);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant={variant}
        size={size}
        className={className}
        loading={pending}
        loadingLabel="Entrando…"
        onClick={enter}
      >
        {label}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

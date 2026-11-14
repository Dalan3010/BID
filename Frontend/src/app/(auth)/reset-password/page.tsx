import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** `/reset-password?token=…` — sets a new password with the emailed token. */
export default function ResetPasswordPage() {
  return (
    <AuthShell
      photo="/images/peak.jpg"
      statement="Empieza de nuevo, *con todo* lo que ya construiste."
      eyebrow="Nueva contraseña"
      title="Elige una contraseña nueva"
      footer={
        <Link href="/sign-in" className="text-paper underline-offset-4 hover:underline">
          Volver a entrar
        </Link>
      }
    >
      {/* The token arrives in the query string. */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

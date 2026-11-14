import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

/** `/forgot-password` — asks for a reset link. */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      photo="/images/forest.jpg"
      statement="Un *paso atrás* también es parte del camino."
      eyebrow="Recuperar acceso"
      title="¿Olvidaste tu contraseña?"
      description="Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva."
      footer={
        <Link href="/sign-in" className="text-paper underline-offset-4 hover:underline">
          Volver a entrar
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

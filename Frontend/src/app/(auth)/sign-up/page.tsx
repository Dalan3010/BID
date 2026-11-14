import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

/** `/sign-up` — self-service registration. */
export default function SignUpPage() {
  return (
    <AuthShell
      photo="/images/cliffs.jpg"
      statement="Toda empresa empezó como una *conversación*."
      eyebrow="Crear cuenta"
      title="Abre tu estudio"
      description="Un espacio privado para pensar tu idea con un coach y convertirla en un plan que tú validas."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/sign-in" className="text-paper underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}

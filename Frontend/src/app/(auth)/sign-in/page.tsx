import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

/** `/sign-in` — email and password, or the demo account in one click. */
export default function SignInPage() {
  return (
    <AuthShell
      photo="/images/ridge.jpg"
      statement="Vuelve a tu *estudio*. Tus ideas siguen donde las dejaste."
      eyebrow="Entrar"
      title="Bienvenido de nuevo"
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/sign-up" className="text-paper underline-offset-4 hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      {/* `useSearchParams` reads `?next=`; Suspense keeps the page prerenderable. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}

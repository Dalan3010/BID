"use client";

import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ArrowIcon, ButtonLink } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

/**
 * Header for the public screens (landing and authentication).
 *
 * Transparent over the photograph. The logo and the <nav> carry
 * `data-enter="nav"` so they join the screen's cinematic entrance; the
 * session-dependent links live inside the <nav>, which always exists, so they
 * are never left pre-hidden when the session resolves late. With a session,
 * the actions become a single way back into the studio.
 */
export function PublicHeader({ className }: { className?: string }) {
  const { data: session, isPending } = useSession();

  return (
    <header
      className={cn(
        "relative z-20 mx-auto flex w-full max-w-studio items-center justify-between px-gutter py-6",
        className,
      )}
    >
      <div data-enter="nav">
        <Logo />
      </div>

      <nav data-enter="nav" aria-label="Acceso" className="flex items-center gap-1 sm:gap-3">
        {isPending ? (
          <span className="h-9 w-28" aria-hidden="true" />
        ) : session ? (
          <ButtonLink href="/dashboard" variant="secondary" size="sm">
            Ir al estudio
            <ArrowIcon />
          </ButtonLink>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center px-3 text-[0.8125rem] text-mist transition-colors duration-300 hover:text-paper"
            >
              Entrar
            </Link>
            <ButtonLink href="/sign-up" variant="secondary" size="sm">
              Crear cuenta
            </ButtonLink>
          </>
        )}
      </nav>
    </header>
  );
}

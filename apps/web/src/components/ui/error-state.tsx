"use client";

import Image from "next/image";
import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";

import { Button, ButtonLink } from "./button";

/**
 * The studio's fallback for an unexpected error inside a route segment.
 *
 * Used by `error.tsx` files. It explains what happened without technical
 * detail, offers to retry (Next.js 16 `retry()`: re-fetches and re-renders the
 * segment) and a way back. The error is logged to the console for debugging;
 * its message is not shown, because in production it may be a generic digest.
 */
export function ErrorState({
  error,
  retry,
  withPhoto = false,
}: {
  error: unknown;
  retry: () => void;
  /** Full-screen version with photography (root level). */
  withPhoto?: boolean;
}) {
  useEffect(() => {
    console.error("[bid] unexpected error:", error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <main
      id="contenido"
      className="relative isolate flex min-h-[60dvh] flex-1 flex-col justify-end gap-8 px-gutter py-20"
    >
      {withPhoto ? (
        <>
          <Image src="/images/forest.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div className="scrim absolute inset-0 -z-10" />
          <div className="absolute top-6 left-[var(--spacing-gutter)]">
            <Logo />
          </div>
        </>
      ) : null}
      <div className="mx-auto flex w-full max-w-studio flex-col gap-6">
        <p className="eyebrow text-bronze">Algo se interrumpió</p>
        <h1 role="alert" className="max-w-[18ch] text-headline font-light text-paper">
          No pudimos mostrar <span className="font-serif italic">esta parte</span>.
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-mist">
          Tus ideas y tu conversación están guardadas en el servidor: este fallo es solo de la
          pantalla. Inténtalo de nuevo o vuelve al estudio.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={retry}>Reintentar</Button>
          <ButtonLink href="/dashboard" variant="secondary">
            Volver al estudio
          </ButtonLink>
        </div>
        {digest ? <p className="text-[0.6875rem] text-stone">Referencia: {digest}</p> : null}
      </div>
    </main>
  );
}

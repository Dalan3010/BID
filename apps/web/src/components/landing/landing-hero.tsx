"use client";

import { useRef } from "react";

import { DemoSignInButton } from "@/components/auth/demo-sign-in-button";
import { CinematicPhoto } from "@/components/motion/cinematic-photo";
import { RevealHeadline } from "@/components/motion/reveal-headline";
import { useCinematicEntrance } from "@/components/motion/use-cinematic-entrance";
import { PublicHeader } from "@/components/navigation/public-header";
import { ArrowIcon, ButtonLink } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

/**
 * The first impression: a full-screen photograph, the headline rising word by
 * word, and two ways in. Everything here joins the cinematic entrance.
 *
 * With a session, the two ways in become one way back to the studio: the demo
 * button would otherwise replace the visitor's own session with the demo's.
 * The `data-enter="action"` wrappers always exist, so content that resolves
 * late is never left pre-hidden.
 */
export function LandingHero() {
  const root = useRef<HTMLElement>(null);
  const { data: session, isPending } = useSession();
  const signedIn = !isPending && Boolean(session);
  useCinematicEntrance(root);

  return (
    <section ref={root} className="relative isolate flex min-h-[100svh] flex-col">
      <div data-enter="backdrop" className="absolute inset-0 -z-10">
        <CinematicPhoto src="/images/summit.jpg" priority parallax />
      </div>

      <PublicHeader />

      <div className="mx-auto flex w-full max-w-studio flex-1 flex-col justify-end px-gutter pt-24 pb-14 sm:pb-20">
        <p data-enter="lede" className="eyebrow mb-8 flex items-center gap-4 text-mist">
          <span aria-hidden="true" className="h-px w-10 bg-bronze" />
          Estudio de ideas de negocio
        </p>

        <RevealHeadline
          text="Donde una idea *empieza* a tomar forma."
          className="max-w-[14ch] text-display font-light text-paper"
          accentClassName="text-[#efe7da]"
        />

        <div className="mt-10 grid gap-10 border-t border-line pt-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p data-enter="lede" className="max-w-xl text-base leading-relaxed text-mist sm:text-lg">
            Conversa con un coach que te hace las preguntas correctas. BID ordena lo que
            cuentas en diez dimensiones de negocio, y <em className="font-serif text-[1.08em] text-paper">tú</em>{" "}
            decides qué entra en tu plan.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div data-enter="action">
              <ButtonLink
                href={signedIn ? "/dashboard" : "/sign-up"}
                size="lg"
                className="w-full sm:w-auto"
              >
                {signedIn ? "Ir a mi estudio" : "Empezar mi idea"}
                <ArrowIcon />
              </ButtonLink>
            </div>
            <div data-enter="action">
              {signedIn ? null : (
                <DemoSignInButton size="lg" className="w-full sm:w-auto" label="Ver la demo" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { NODE_TYPES } from "@bid/core";
import Image from "next/image";

import { Logo } from "@/components/brand/logo";
import { LandingHero } from "@/components/landing/landing-hero";
import { Reveal } from "@/components/motion/reveal";
import { ArrowIcon, ButtonLink } from "@/components/ui/button";
import { DIMENSIONS, dimensionIndex } from "@/lib/dimensions";

/**
 * `/` — the public landing.
 *
 * Editorial, not promotional: it explains the product's three moves and its
 * one rule (the AI proposes, the person validates). No invented numbers,
 * testimonials or features the API does not support.
 */

const STEPS = [
  {
    title: "Conversa",
    body: "Cuéntale tu idea al coach con tus palabras. Te pregunta lo que falta, en el orden en que importa.",
  },
  {
    title: "Revisa",
    body: "Mientras hablan, BID identifica piezas de tu negocio y te las propone. Nada entra solo.",
  },
  {
    title: "Construye",
    body: "Lo que confirmas o corriges se convierte en tu plan: diez dimensiones que muestran qué está sólido y qué no.",
  },
] as const;

const PROVENANCE = [
  {
    name: "Propuesto",
    detail: "Lo identificó el coach. Es una pregunta, no una respuesta: no cuenta en tu progreso.",
  },
  {
    name: "Confirmado",
    detail: "Lo revisaste y es correcto. Ahora forma parte de tu plan.",
  },
  {
    name: "Escrito por ti",
    detail: "Lo corregiste con tus palabras. Ninguna extracción automática lo vuelve a tocar.",
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <main id="contenido" className="flex-1">
        <LandingHero />

        {/* How it works */}
        <section aria-labelledby="como-funciona" className="border-t border-line">
          <div className="mx-auto grid max-w-studio gap-14 px-gutter py-24 md:grid-cols-12 md:py-32">
            <div className="md:col-span-4">
              <p className="eyebrow mb-6 text-stone">01 — Método</p>
              <h2 id="como-funciona" className="text-headline font-light text-paper">
                Tres gestos, <span className="font-serif italic">un plan</span>.
              </h2>
            </div>
            <Reveal as="ol" className="grid gap-px bg-line md:col-span-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} data-reveal className="flex flex-col gap-5 bg-ink-950 p-6 md:p-8">
                  <span className="font-serif text-4xl text-bronze italic">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-medium text-paper">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-mist">{step.body}</p>
                </li>
              ))}
            </Reveal>
          </div>
        </section>

        {/* The rule */}
        <section aria-labelledby="regla" className="relative isolate overflow-hidden border-t border-line">
          <div className="mx-auto grid max-w-studio gap-14 px-gutter py-24 md:grid-cols-12 md:py-32">
            <div className="relative aspect-[4/5] overflow-hidden md:col-span-5">
              <Image
                src="/images/atelier.jpg"
                alt=""
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink-950/70 to-transparent" />
            </div>
            <div className="flex flex-col justify-center md:col-span-6 md:col-start-7">
              <p className="eyebrow mb-6 text-stone">02 — Principio</p>
              <h2 id="regla" className="text-headline font-light text-paper">
                La IA propone. <span className="font-serif italic">Tú decides.</span>
              </h2>
              <p className="mt-6 max-w-lg leading-relaxed text-mist">
                Cada pieza de tu plan declara de dónde viene. Así sabes en todo momento qué
                afirmaste tú y qué es todavía una suposición.
              </p>
              <Reveal as="ul" className="mt-10 border-t border-line">
                {PROVENANCE.map((item) => (
                  <li
                    key={item.name}
                    data-reveal
                    className="grid gap-2 border-b border-line py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8"
                  >
                    <span className="eyebrow pt-1 text-paper">{item.name}</span>
                    <span className="text-sm leading-relaxed text-mist">{item.detail}</span>
                  </li>
                ))}
              </Reveal>
            </div>
          </div>
        </section>

        {/* The ten dimensions */}
        <section aria-labelledby="dimensiones" className="border-t border-line">
          <div className="mx-auto max-w-studio px-gutter py-24 md:py-32">
            <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="eyebrow mb-6 text-stone">03 — Estructura</p>
                <h2 id="dimensiones" className="max-w-[18ch] text-headline font-light text-paper">
                  Diez preguntas que todo negocio <span className="font-serif italic">responde</span>.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-mist">
                El coach recorre estas dimensiones en orden. Tu progreso solo avanza cuando
                validas una.
              </p>
            </div>
            <Reveal as="ol" className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-5">
              {NODE_TYPES.map((type) => (
                <li
                  key={type}
                  data-reveal
                  className="flex min-h-40 flex-col justify-between gap-6 border-b border-line py-6 sm:pr-6 lg:border-r lg:px-5 lg:[&:nth-child(5n)]:border-r-0"
                >
                  <span className="eyebrow text-stone">{dimensionIndex(type)}</span>
                  <div>
                    <h3 className="font-serif text-2xl text-paper">{DIMENSIONS[type].label}</h3>
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-stone">
                      {DIMENSIONS[type].question}
                    </p>
                  </div>
                </li>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Closing */}
        <section aria-labelledby="cierre" className="relative isolate overflow-hidden border-t border-line">
          <Image src="/images/ridge.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div className="scrim absolute inset-0 -z-10" />
          <div className="mx-auto flex max-w-studio flex-col items-start gap-10 px-gutter py-28 md:py-40">
            <h2 id="cierre" className="max-w-[16ch] text-headline font-light text-paper">
              Las ideas merecen un lugar donde{" "}
              <span className="font-serif italic">convertirse en algo real</span>.
            </h2>
            <ButtonLink href="/sign-up" size="lg">
              Abrir mi estudio
              <ArrowIcon />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-studio flex-col gap-6 px-gutter py-10 text-[0.8125rem] text-stone sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="max-w-md leading-relaxed">
            BID es un acompañamiento para pensar tu negocio. No sustituye asesoría legal,
            contable ni financiera profesional.
          </p>
        </div>
      </footer>
    </>
  );
}

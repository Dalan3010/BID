"use client";

import { useRef, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { CinematicPhoto } from "@/components/motion/cinematic-photo";
import { RevealHeadline } from "@/components/motion/reveal-headline";
import { useCinematicEntrance } from "@/components/motion/use-cinematic-entrance";

/**
 * The frame of every authentication screen.
 *
 * Desktop: an asymmetric split — the photograph with an editorial statement on
 * the left (7/12), the form on solid ink on the right (5/12).
 * Mobile: the photograph becomes a short band with the statement; the form
 * follows below at full width, so the keyboard never covers a squeezed column.
 *
 * Each screen runs its own cinematic entrance, so moving between sign-in and
 * sign-up replays it instead of leaving elements hidden.
 */
export function AuthShell({
  photo,
  statement,
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  /** Path under /public/images. */
  photo: string;
  /** Large editorial line on the photograph; accent words between asterisks. */
  statement: string;
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useCinematicEntrance(root);

  return (
    <div ref={root} className="grid min-h-dvh flex-1 lg:grid-cols-12">
      {/* Photograph and statement */}
      <aside
        data-enter="backdrop"
        className="relative isolate flex min-h-[38svh] flex-col justify-between overflow-hidden p-gutter lg:col-span-7 lg:min-h-dvh"
      >
        <CinematicPhoto src={photo} priority sizes="(min-width: 1024px) 58vw, 100vw" />
        <div data-enter="nav" className="relative">
          <Logo />
        </div>
        <div className="relative mt-16 max-w-2xl">
          <RevealHeadline
            as="p"
            text={statement}
            className="text-headline font-light text-paper lg:text-[clamp(2.75rem,1.5rem+3vw,5rem)]"
          />
          <p data-enter="lede" className="eyebrow mt-8 hidden items-center gap-4 text-mist lg:flex">
            <span aria-hidden="true" className="h-px w-10 bg-bronze" />
            BID Studio
          </p>
        </div>
      </aside>

      {/* Form */}
      <main
        id="contenido"
        className="flex flex-col justify-center bg-ink-950 px-gutter py-12 lg:col-span-5 lg:py-16"
      >
        <div className="mx-auto w-full max-w-sm">
          <div data-enter="block">
            <p className="eyebrow mb-5 text-bronze">{eyebrow}</p>
            <h1 className="font-serif text-title text-paper sm:text-[2.5rem] sm:leading-[1.05]">
              {title}
            </h1>
            {description ? (
              <div className="mt-4 text-sm leading-relaxed text-mist">{description}</div>
            ) : null}
          </div>

          <div data-enter="block" className="mt-10">
            {children}
          </div>

          {footer ? (
            <div data-enter="block" className="mt-10 border-t border-line pt-6 text-sm text-stone">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

"use client";

import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";

import { useAnimeScope } from "@/components/motion/use-anime-scope";
import { Button } from "@/components/ui/button";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { TOUR_STEPS, type TourStep } from "@/lib/onboarding";

/**
 * The guided tour of the workspace.
 *
 * A small card docked near the top of the screen walks through three steps.
 * The element of each step is brought into view and outlined in amber
 * (`data-tour-target`, styled in `globals.css`); the card itself is a
 * non-modal `role="dialog"`, so the page stays usable. Esc or "Saltar" ends
 * it. The card enters with Anime.js; the outline pulses once per step.
 */
export function WorkspaceTour({
  onShowPane,
  onFinish,
}: {
  /** Makes the step's pane visible on small screens. */
  onShowPane: (pane: TourStep["pane"]) => void;
  /** Called when the tour ends (finished or skipped). */
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  useAnimeScope(card, () => {
    if (!card.current) return;
    animate(card.current, { opacity: [0, 1], y: [16, 0], duration: 700, ease: EASE.enter });
  });

  // Point at the step's element: show its pane, scroll to it, outline it.
  useEffect(() => {
    onShowPane(step.pane);
    let target: HTMLElement | null = null;
    const frame = requestAnimationFrame(() => {
      target = step.target ? document.getElementById(step.target) : null;
      if (!target) return;
      target.setAttribute("data-tour-target", "");
      target.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      if (!prefersReducedMotion()) {
        animate(target, { outlineOffset: ["14px", "4px"], duration: 900, ease: EASE.enter });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      target?.removeAttribute("data-tour-target");
      target?.style.removeProperty("outline-offset");
    };
  }, [step, onShowPane]);

  useEffect(() => {
    card.current?.querySelector<HTMLButtonElement>("[data-tour-primary]")?.focus();
  }, [index]);

  return (
    // Docked at the top (under the headers) so it never covers the composer,
    // and inside the conversation column on desktop so it never covers the plan.
    <div className="pointer-events-none fixed inset-x-0 top-[8.5rem] z-40 flex justify-center px-4 lg:top-[9.5rem] lg:justify-start lg:pl-10">
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="guia-titulo"
        aria-describedby="guia-texto"
        onKeyDown={(event) => {
          if (event.key === "Escape") onFinish();
        }}
        className="pointer-events-auto w-full max-w-md border border-amber/40 bg-ink-900 p-5 shadow-panel sm:p-6"
      >
        <p className="eyebrow mb-3 text-bronze">
          Guía · {index + 1} de {TOUR_STEPS.length}
        </p>
        <h2 id="guia-titulo" className="font-serif text-2xl text-paper">
          {step.title}
        </h2>
        <p id="guia-texto" className="mt-2 text-sm leading-relaxed text-mist">
          {step.body}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onFinish}>
            Saltar
          </Button>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setIndex(index - 1)}>
                Anterior
              </Button>
            ) : null}
            <Button
              data-tour-primary
              size="sm"
              onClick={() => (last ? onFinish() : setIndex(index + 1))}
            >
              {last ? "Empezar" : "Siguiente"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

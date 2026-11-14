"use client";

import { animate, svg } from "animejs";
import { useRef } from "react";

import { useAnimeScope } from "@/components/motion/use-anime-scope";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";

/**
 * Progress indicators that draw themselves.
 *
 * Both expose `role="progressbar"` with `aria-valuenow`, so the value is
 * available to assistive technology regardless of the animation. The final
 * state is rendered by React; Anime.js only animates *towards* it, so a
 * reduced-motion user sees the exact value immediately.
 */

interface ProgressProps {
  /** 0..100 */
  value: number;
  label: string;
  className?: string;
}

/** A hairline bar; the filled part grows from the left. */
export function ProgressBar({ value, label, className }: ProgressProps) {
  const root = useRef<HTMLDivElement>(null);
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  useAnimeScope(
    root,
    () => {
      const fill = root.current?.querySelector<HTMLElement>("[data-fill]");
      if (!fill) return;
      animate(fill, {
        scaleX: [0, clamped / 100],
        duration: 1400,
        delay: 250,
        ease: EASE.enter,
      });
    },
    [clamped],
  );

  return (
    <div
      ref={root}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped}%`}
      className={cn("relative h-px w-full bg-line-strong", className)}
    >
      <div
        data-fill
        className="absolute inset-y-0 left-0 w-full origin-left bg-bronze"
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}

/** A thin ring with the percentage in serif at its center. */
export function ProgressRing({
  value,
  label,
  className,
  size = 64,
}: ProgressProps & { size?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 15.5;

  useAnimeScope(
    root,
    () => {
      const arc = root.current?.querySelector<SVGCircleElement>("[data-arc]");
      if (!arc || clamped === 0) return;
      animate(svg.createDrawable(arc), {
        draw: ["0 0", `0 ${clamped / 100}`],
        duration: 1600,
        delay: 300,
        ease: EASE.enter,
      });
    },
    [clamped],
  );

  const circumference = 2 * Math.PI * radius;

  return (
    <div
      ref={root}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped}%`}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--color-line-strong)" strokeWidth="1" />
        {clamped > 0 ? (
          <circle
            data-arc
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--color-bronze)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          />
        ) : null}
      </svg>
      <span className="font-serif text-[1.35em] leading-none text-paper" aria-hidden="true">
        {clamped}
        <span className="text-[0.55em] text-stone">%</span>
      </span>
    </div>
  );
}

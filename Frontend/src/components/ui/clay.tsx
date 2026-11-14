import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Clay surfaces.
 *
 * A dark claymorphism panel: one light source top-left, a hairline that reads as
 * the edge of a physical block, an inner highlight on the top face and a diffuse
 * drop shadow underneath. Three depths:
 *
 * - `raised` cards and dialogs float over the page
 * - `sunken` wells (inputs, empty canvases) receive the page shadow
 * - `flush` hairline only, for surfaces inside another clay block
 *
 * Radius and shadows come from the tokens in `globals.css`, so the whole
 * product moves together.
 */

export type ClayTone = "raised" | "sunken" | "flush";

const TONE: Record<ClayTone, string> = {
  raised: "bg-ink-900 border border-paper/[0.06] shadow-clay",
  sunken: "bg-ink-800 border border-black/40 shadow-clay-inset",
  flush: "bg-ink-900 border border-line",
};

interface ClayPanelProps extends ComponentProps<"div"> {
  tone?: ClayTone;
  /** Lifts the block on hover; use it only for clickable surfaces. */
  interactive?: boolean;
  children?: ReactNode;
}

export function ClayPanel({
  tone = "raised",
  interactive = false,
  className,
  children,
  ...props
}: ClayPanelProps) {
  return (
    <div
      className={cn(
        "rounded-clay-lg",
        TONE[tone],
        interactive &&
          "transition-[transform,box-shadow,background-color] duration-300 ease-[var(--ease-studio)] hover:-translate-y-0.5 hover:shadow-clay-lift focus-within:-translate-y-0.5 focus-within:shadow-clay-lift",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** The recessed variant, for anything the user types into or drops content on. */
export function ClayWell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-clay-sm border border-black/40 bg-ink-800 shadow-clay-inset", className)}
      {...props}
    />
  );
}

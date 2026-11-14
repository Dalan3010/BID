import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Buttons.
 *
 * Compact by design: the studio speaks through type and space, not through
 * big colored blocks. Four variants:
 *
 * - `primary`   paper on ink, the one action that matters on a screen
 * - `accent`    bronze, reserved for confirming something into the plan
 * - `secondary` hairline outline
 * - `ghost`     text only, for tertiary actions
 *
 * Hover is a slow fill and a 2px arrow nudge (see `ArrowIcon`), never a glow.
 */

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "group/button relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium tracking-[-0.005em] transition-[background-color,color,border-color,opacity] duration-300 ease-[var(--ease-studio)] disabled:cursor-not-allowed disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-paper text-ink-950 hover:bg-mist",
  accent: "bg-bronze text-ink-950 hover:bg-amber",
  secondary:
    "border border-line-strong text-paper hover:border-paper/50 hover:bg-paper/[0.04]",
  ghost: "text-mist hover:text-paper",
  danger:
    "border border-danger/50 text-danger hover:border-danger hover:bg-danger/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

/** Class string for anything that should look like a button. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a quiet pulse and blocks the button while a request runs. */
  loading?: boolean;
  /** Visible label while loading; defaults to the children. */
  loadingLabel?: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  loadingLabel,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonOwnProps & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <PulseDot />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: Omit<ButtonOwnProps, "loading" | "loadingLabel"> & ComponentProps<typeof Link>) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

/** Arrow that nudges right when its button is hovered. */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn(
        "size-3.5 transition-transform duration-300 ease-[var(--ease-studio)] group-hover/button:translate-x-0.5",
        className,
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}

/** A small breathing dot used as an inline loading indicator. */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-1.5 animate-pulse rounded-full bg-current opacity-70",
        className,
      )}
    />
  );
}

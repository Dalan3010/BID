import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Buttons.
 *
 * Clay relief: a soft gradient top face, an inner top highlight and a diffuse
 * drop shadow, pressed in with `active:translate-y-px`. Four variants:
 *
 * - `primary`   cream clay, the one action that matters on a screen
 * - `accent`    bronze clay, reserved for confirming something into the plan
 * - `secondary` graphite clay with a hairline edge
 * - `ghost`     text only, for tertiary actions
 *
 * Hover lifts the fill and nudges the arrow 2px (see `ArrowIcon`), never glows.
 */

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "group/button relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-clay font-medium tracking-[-0.005em] transition-[transform,background-color,color,border-color,box-shadow,filter,opacity] duration-300 ease-[var(--ease-studio)] active:translate-y-px active:shadow-clay-pressed disabled:cursor-not-allowed disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(180deg,#f4ecd9_0%,#e6dec5_55%,#d8cfb2_100%)] text-ink-950 shadow-clay-solid hover:brightness-[1.04]",
  accent:
    "bg-[linear-gradient(180deg,#c79a6d_0%,#b98a5f_55%,#a77850_100%)] text-ink-950 shadow-clay-solid hover:brightness-[1.05]",
  secondary: "border border-paper/[0.06] bg-ink-900 text-paper shadow-clay hover:bg-ink-850",
  ghost: "text-mist hover:bg-paper/[0.05] hover:text-paper",
  danger:
    "border border-danger/40 bg-danger/[0.09] text-danger shadow-clay hover:bg-danger/[0.15]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[0.9375rem]",
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

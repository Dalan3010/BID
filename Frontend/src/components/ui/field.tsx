"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Form fields.
 *
 * Clay wells: the control sits sunken into the panel (`shadow-clay-inset`), so
 * it reads as a slot carved for the input rather than a rectangle drawn on top.
 * The label keeps the eyebrow style and the error is linked with
 * `aria-describedby`, marking the input `aria-invalid`.
 */

interface FieldChrome {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Element shown at the right of the label (e.g. "¿La olvidaste?"). */
  aside?: ReactNode;
}

const CONTROL =
  "w-full rounded-clay-sm border border-black/40 bg-ink-800 px-4 py-3 text-[0.9375rem] text-paper shadow-clay-inset placeholder:text-stone transition-[border-color,box-shadow,background-color] duration-300 hover:bg-ink-700/60 focus:border-amber/70 focus:bg-ink-800 focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-danger/70 disabled:opacity-50";

function FieldFrame({
  id,
  label,
  hint,
  error,
  aside,
  describedBy,
  children,
}: FieldChrome & { id: string; describedBy: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="eyebrow text-mist">
          {label}
        </label>
        {aside}
      </div>
      {children}
      <div id={describedBy} className="min-h-5 pt-1 text-[0.8125rem] leading-5">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : hint ? (
          <span className="text-stone">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  aside,
  className,
  id: providedId,
  ...props
}: FieldChrome & ComponentProps<"input">) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = `${id}-description`;

  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      error={error}
      aside={aside}
      describedBy={describedBy}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL, className)}
        {...props}
      />
    </FieldFrame>
  );
}

export function TextArea({
  label,
  hint,
  error,
  aside,
  className,
  id: providedId,
  ...props
}: FieldChrome & ComponentProps<"textarea">) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = `${id}-description`;

  return (
    <FieldFrame
      id={id}
      label={label}
      hint={hint}
      error={error}
      aside={aside}
      describedBy={describedBy}
    >
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL, "resize-none leading-relaxed", className)}
        {...props}
      />
    </FieldFrame>
  );
}

"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Form fields.
 *
 * Minimal: a label in eyebrow style, an underline-only input on dark ground
 * and room for a hint or an error. The error is linked with
 * `aria-describedby` and marks the input `aria-invalid`.
 */

interface FieldChrome {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Element shown at the right of the label (e.g. "¿La olvidaste?"). */
  aside?: ReactNode;
}

const CONTROL =
  "w-full border-0 border-b border-line-strong bg-transparent px-0 py-3 text-[0.9375rem] text-paper placeholder:text-stone transition-colors duration-300 focus:border-amber focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-danger disabled:opacity-50";

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

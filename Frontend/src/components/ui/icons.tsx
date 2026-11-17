/**
 * Icons of the chat composer and the attachment previews.
 *
 * Same recipe as `ArrowIcon` in `ui/button.tsx`: a 1.25rem stroke glyph that
 * inherits `currentColor`, decorative by default (`aria-hidden`), so the
 * control that wraps it owns the accessible name.
 */

const base = {
  width: "1.25em",
  height: "1.25em",
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

/** Paperclip: attach a file. */
export function ClipIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M13.9 6.1 7.6 12.4a2.05 2.05 0 0 0 2.9 2.9l6.6-6.6a3.6 3.6 0 0 0-5.1-5.1L5.3 10.3a5.1 5.1 0 0 0 7.2 7.2l4.1-4.1" />
    </svg>
  );
}

/** A page with a folded corner: PDF. */
export function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M11.5 2.5h-5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V6z" />
      <path d="M11.5 2.5V6H15" />
      <path d="M7.5 10.5h5M7.5 13.5h5" />
    </svg>
  );
}

/** X: discard. */
export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

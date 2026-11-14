import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Inline notices.
 *
 * `error` uses `role="alert"` (announced immediately); every other tone uses
 * `role="status"` (announced politely). A thin left rule carries the tone, so
 * the notice never shouts with a colored block.
 */

export type AlertTone = "error" | "warning" | "info" | "success";

const TONES: Record<AlertTone, string> = {
  error: "border-danger text-paper",
  warning: "border-amber text-paper",
  info: "border-stone text-mist",
  success: "border-sage text-paper",
};

const LABELS: Record<AlertTone, string> = {
  error: "Error",
  warning: "Aviso",
  info: "Nota",
  success: "Hecho",
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Optional trailing control (retry, dismiss…). */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-4 border-l bg-ink-900/80 py-3 pr-3 pl-4 text-sm leading-relaxed",
        TONES[tone],
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-1.5 text-stone">{title ?? LABELS[tone]}</p>
        {children ? <div>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

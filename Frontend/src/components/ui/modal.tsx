"use client";

import { animate } from "animejs";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { EASE, prefersReducedMotion } from "@/lib/motion";

/**
 * A modal dialog built on the native `<dialog>`.
 *
 * `showModal()` gives focus trapping, `Escape` to close, the top layer (no
 * z-index fights) and an inert background for free. The panel rises in with
 * Anime.js when it opens.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: {
  /** `md`: a compact dialog. `full`: almost the whole viewport (the canvas). */
  size?: "md" | "full";
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
      if (!prefersReducedMotion()) {
        const animation = animate(element, {
          opacity: [0, 1],
          y: [16, 0],
          duration: 520,
          ease: EASE.enter,
        });
        return () => {
          animation.revert();
        };
      }
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto rounded-clay-lg border border-paper/[0.06] bg-ink-900 p-0 text-paper shadow-clay-panel",
        size === "md"
          ? "w-[min(32rem,calc(100vw-2rem))]"
          : "h-[calc(100dvh-2rem)] max-h-none w-[calc(100vw-2rem)] max-w-none",
        "backdrop:bg-ink-950/80 backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-6 p-6 sm:p-8", size === "full" && "h-full min-h-0")}>
        <header className="flex flex-col gap-2">
          <h2 id={titleId} className="font-serif text-title text-paper">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-sm leading-relaxed text-mist">
              {description}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </dialog>
  );
}

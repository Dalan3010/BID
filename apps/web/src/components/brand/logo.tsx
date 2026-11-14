import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * The BID wordmark.
 *
 * A serif italic "bid" followed by a tracked "Studio" label, separated by a
 * hairline. No symbol, no gradient: the identity is typographic.
 */
export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="BID, inicio"
      className={cn("group inline-flex items-center gap-3 text-paper", className)}
    >
      <span className="font-serif text-[1.65rem] leading-none italic tracking-[-0.02em]">
        bid
      </span>
      <span aria-hidden="true" className="h-4 w-px bg-line-strong" />
      <span className="eyebrow text-mist transition-colors duration-300 group-hover:text-paper">
        Studio
      </span>
    </Link>
  );
}

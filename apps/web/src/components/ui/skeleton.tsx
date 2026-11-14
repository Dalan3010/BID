import { cn } from "@/lib/cn";

/**
 * Loading placeholders.
 *
 * A slow, low-contrast shimmer on graphite. Skeletons keep the final layout's
 * size so nothing jumps when the data arrives.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-xs bg-ink-800",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[bid-shimmer_2.4s_ease-in-out_infinite]",
        "before:bg-linear-to-r before:from-transparent before:via-paper/[0.05] before:to-transparent",
        className,
      )}
    />
  );
}

/** Several text-like lines of decreasing width. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Screen-reader announcement for a region that is loading. */
export function LoadingStatus({ label }: { label: string }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}

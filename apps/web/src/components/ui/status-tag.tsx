import type { NodeSource } from "@bid/core";

import { cn } from "@/lib/cn";
import {
  SOURCE_LABEL,
  STATUS_LABEL,
  type DimensionStatus,
} from "@/lib/dimensions";

/**
 * Status labels.
 *
 * A dot plus an eyebrow label. The dot's shape carries meaning without color
 * alone: a ring for open, a half for pending, a filled dot for validated.
 */

const DOT: Record<DimensionStatus, string> = {
  validated: "bg-sage",
  pending: "bg-[linear-gradient(90deg,var(--color-amber)_50%,transparent_50%)] ring-1 ring-amber",
  open: "ring-1 ring-stone",
};

const TEXT: Record<DimensionStatus, string> = {
  validated: "text-sage",
  pending: "text-amber",
  open: "text-stone",
};

export function StatusTag({
  status,
  className,
  label,
}: {
  status: DimensionStatus;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn("eyebrow inline-flex items-center gap-2", TEXT[status], className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[status])} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

const SOURCE_STATUS: Record<NodeSource, DimensionStatus> = {
  inferred: "pending",
  confirmed: "validated",
  edited: "validated",
};

/** Provenance of a single node: pending, confirmed or written by the user. */
export function SourceTag({
  source,
  className,
}: {
  source: NodeSource;
  className?: string;
}) {
  return (
    <StatusTag
      status={SOURCE_STATUS[source]}
      label={SOURCE_LABEL[source]}
      className={className}
    />
  );
}

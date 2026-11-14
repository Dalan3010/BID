"use client";

import { ErrorState } from "@/components/ui/error-state";

/**
 * Error boundary for every route below the root layout (landing and
 * authentication). Next.js 16 passes `retry`, which re-fetches and
 * re-renders the segment.
 */
export default function RootSegmentError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} withPhoto />;
}

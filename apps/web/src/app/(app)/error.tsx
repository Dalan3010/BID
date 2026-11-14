"use client";

import { ErrorState } from "@/components/ui/error-state";

/**
 * Error boundary for the studio (dashboard, workspace, account). It renders
 * inside the studio layout, so the header and navigation stay usable.
 */
export default function StudioError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorState error={error} retry={retry} />;
}

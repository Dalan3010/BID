import type { Metadata } from "next";

import { StudioView } from "@/components/dashboard/studio-view";

export const metadata: Metadata = { title: "Estudio" };

/** `/dashboard` — the user's ideas with their real progress and agenda. */
export default function DashboardPage() {
  return <StudioView />;
}

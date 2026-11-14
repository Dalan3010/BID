import type { ReactNode } from "react";

import { AppShell } from "@/components/navigation/app-shell";

/** Layout of the authenticated studio: dashboard, workspace and account. */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

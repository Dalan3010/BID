"use client";

import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ShortcutsHelp } from "@/components/shortcuts/shortcuts-help";
import { LoadingStatus } from "@/components/ui/skeleton";
import { useRequireSession } from "@/lib/session";

import { AppHeader } from "./app-header";

/**
 * Frame of every authenticated screen: session guard + studio header.
 *
 * While the session is being checked it shows a quiet placeholder with the
 * wordmark; without a session `useRequireSession` redirects to `/sign-in`.
 * The API stays the real gatekeeper: every request without a cookie gets 401.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useRequireSession();

  if (isPending || !session) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6">
        <div className="animate-pulse opacity-60">
          <Logo />
        </div>
        <LoadingStatus label="Comprobando tu sesión…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AppHeader userName={session.user.name} />
      <div id="contenido" className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
      <ShortcutsHelp />
    </div>
  );
}

"use client";

/**
 * Session guards.
 *
 * The session cookie belongs to the API and is httpOnly, so the client learns
 * whether someone is signed in by asking Better Auth (`/api/auth/get-session`).
 * Guards are client-side redirects for navigation comfort only: authorization
 * is always enforced by the API, which answers 401 without a session.
 */
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "./auth-client";

/** Where to go after signing in, kept only if it is an in-app path. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

/**
 * Requires a session; sends the visitor to `/sign-in` otherwise, remembering
 * where they were going.
 */
export function useRequireSession() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const signedOut = !session.isPending && !session.data;

  useEffect(() => {
    if (signedOut) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [signedOut, router, pathname]);

  return session;
}

/** On auth pages: a visitor who is already signed in goes to the studio. */
export function useRedirectIfSignedIn(next: string | null) {
  const session = useSession();
  const router = useRouter();

  const signedIn = !session.isPending && Boolean(session.data);

  useEffect(() => {
    if (signedIn) {
      router.replace(safeNextPath(next));
    }
  }, [signedIn, router, next]);

  return session;
}

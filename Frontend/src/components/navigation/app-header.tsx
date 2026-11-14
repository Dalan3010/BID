"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth-client";
import { firstName } from "@/lib/format";

/**
 * Header of the authenticated studio.
 *
 * Desktop: wordmark, section links and the account at the right.
 * Mobile: wordmark and a menu button that opens a full-width sheet with the
 * same links and generous touch targets. The sheet closes on navigation and on
 * `Escape`, and returns focus to the button.
 */

const LINKS = [
  { href: "/dashboard", label: "Estudio" },
  { href: "/profile", label: "Cuenta" },
] as const;

export function AppHeader({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Close the sheet whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    // The session is invalidated on the server, not only in the browser.
    await signOut();
    router.replace("/sign-in");
  }

  const isActive = (href: string) =>
    pathname === href || (href === "/dashboard" && pathname.startsWith("/ideas/"));

  const name = firstName(userName);

  return (
    <header className="relative z-30 border-b border-line bg-ink-950/90 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex h-16 max-w-studio items-center justify-between gap-6 px-gutter">
        <Logo href="/dashboard" />

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "eyebrow relative py-2 transition-colors duration-300",
                isActive(link.href) ? "text-paper" : "text-stone hover:text-mist",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-bronze after:transition-transform after:duration-500",
                isActive(link.href) ? "after:scale-x-100" : "after:scale-x-0",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          {name ? <span className="text-[0.8125rem] text-mist">{name}</span> : null}
          <span aria-hidden="true" className="h-4 w-px bg-line-strong" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="eyebrow text-stone transition-colors duration-300 hover:text-paper disabled:opacity-50"
          >
            {signingOut ? "Saliendo…" : "Salir"}
          </button>
        </div>

        <button
          ref={menuButton}
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center md:hidden"
          aria-expanded={menuOpen}
          aria-controls="app-menu"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="relative block h-3 w-5">
            <span
              className={cn(
                "absolute left-0 h-px w-full bg-paper transition-transform duration-300",
                menuOpen ? "top-1.5 rotate-45" : "top-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 h-px w-full bg-paper transition-transform duration-300",
                menuOpen ? "top-1.5 -rotate-45" : "top-3",
              )}
            />
          </span>
        </button>
      </div>

      <div
        id="app-menu"
        hidden={!menuOpen}
        className="absolute inset-x-0 top-full border-b border-line bg-ink-950 px-gutter pt-2 pb-6 shadow-panel md:hidden"
      >
        <nav aria-label="Principal móvil" className="flex flex-col">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex h-14 items-center justify-between border-b border-line font-serif text-2xl",
                isActive(link.href) ? "text-paper" : "text-mist",
              )}
            >
              {link.label}
              {isActive(link.href) ? (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-bronze" />
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-mist">{name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="eyebrow inline-flex h-11 items-center text-stone hover:text-paper"
          >
            {signingOut ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </header>
  );
}

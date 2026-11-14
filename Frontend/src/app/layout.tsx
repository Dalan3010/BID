import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BID — Estudio de ideas de negocio",
    template: "%s · BID",
  },
  description:
    "Conversa con un coach de negocio y mira cómo tu idea se convierte en un plan que tú validas.",
};

export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
};

/**
 * Turns motion on before the first paint, unless the user asked for less.
 *
 * With `data-motion="on"`, elements marked `data-enter` start hidden so the
 * cinematic entrance can reveal them without a flash (see `globals.css`).
 * Without this script — or with reduced motion — nothing is ever hidden.
 */
const MOTION_SCRIPT = `try{if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.motion="on"}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body className="grain flex min-h-dvh flex-col bg-ink-950 text-paper">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:text-ink-950"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}

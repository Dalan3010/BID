import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BID — Coach de ideas de negocio",
  description:
    "Un coach que ayuda a cimentar una idea de negocio: conversación natural, estructura extraída y visualizaciones que muestran qué falta.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

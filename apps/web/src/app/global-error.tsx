"use client";

/**
 * Last-resort boundary, for errors in the root layout itself.
 *
 * Next.js renders it as its own document, **without** `globals.css` or the
 * fonts, so the studio palette is applied with inline styles and system
 * fonts. It must define `<html>` and `<body>`.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          background: "#090909",
          color: "#E5E0D6",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <title>BID — Algo se interrumpió</title>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#A77850" }}>
          Algo se interrumpió
        </p>
        <h1 style={{ margin: 0, fontWeight: 300, fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1 }}>
          BID no pudo cargarse.
        </h1>
        <p style={{ margin: 0, maxWidth: "28rem", color: "#C7C2B8", lineHeight: 1.6 }}>
          Tus datos están guardados en el servidor. Vuelve a intentarlo en un momento.
        </p>
        <div>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              height: 44,
              padding: "0 1.25rem",
              border: 0,
              borderRadius: 4,
              background: "#E5E0D6",
              color: "#090909",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}

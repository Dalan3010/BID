# `@bid/web` — BID Creative Studio

El cliente de BID: un estudio digital, oscuro y editorial, donde una persona
conversa con un coach de negocio y ve cómo su idea se convierte en un plan que
**ella valida**.

Es **solo cliente**. No toca la base de datos ni importa nada de `apps/api`:
habla con la API por HTTP (cookie de sesión httpOnly) y comparte con ella
únicamente los tipos y las proyecciones puras de `@bid/core`.

| Documento | Qué contiene |
|---|---|
| [`PRODUCT.md`](PRODUCT.md) | Voz del producto, principios y dirección artística |
| [`docs/arquitectura-cliente.md`](docs/arquitectura-cliente.md) | Capas, flujo de datos, integración con cada endpoint y limitaciones del backend |
| [`docs/design-system.md`](docs/design-system.md) | Tokens, tipografía, componentes y reglas de uso |
| [`docs/motion.md`](docs/motion.md) | Catálogo de animaciones con Anime.js 4 y reglas de rendimiento |
| [`docs/diario-de-cambios.md`](docs/diario-de-cambios.md) | Cada cambio: qué, por qué, archivos y verificación |
| [`public/images/CREDITS.md`](public/images/CREDITS.md) | Origen y tratamiento de la fotografía; licencias de las fuentes |

---

## Stack

| Pieza | Versión | Uso |
|---|---|---|
| Next.js (App Router, Turbopack) | 16.4 | Rutas, build |
| React | 19.3 | UI |
| TypeScript | 5.9 | Todo el código |
| Tailwind CSS (loader `@tailwindcss/turbopack`) | 4.3 | Estilos a partir de tokens `@theme` |
| Anime.js | 4.5 | **Único** motor de animación |
| Better Auth (cliente) | 1.7 | Sesión, registro, recuperación de contraseña |
| @xyflow/react | 12 | Árbol técnico (vista secundaria, carga diferida) |
| Vitest + Testing Library + jsdom | 5 / 16 / 31 | Tests de lógica y de componentes |
| Playwright (`@playwright/test`) | 1.65 | E2E contra la API real |

Las fuentes (Inter, Instrument Serif) se sirven desde `public/fonts`: el build
**no descarga nada** y no usa `next/font`. Las fotos se optimizan al vuelo con
`next/image` (AVIF/WebP) usando `sharp`, que ya trae Next.js.

## Ejecutar

Desde la raíz del monorepo (ver el `README.md` principal):

```bash
pnpm install
docker compose up -d && pnpm db:migrate && pnpm db:seed
pnpm dev                 # API en :3001 y este cliente en :3000
```

El cliente lee `NEXT_PUBLIC_API_URL` del único `.env.local` de la raíz
(`next.config.ts` lo carga con `loadEnvConfig`). Se incrusta en el bundle al
compilar, así que debe estar definido antes de `pnpm build`.

| Script (en `Frontend`) | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build de producción y servidor |
| `pnpm lint` | ESLint (flat config de `eslint-config-next`) |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` (genera `PageProps` antes de comprobar) |
| `pnpm test` | Tests de `src/lib` (Node) y de componentes (jsdom) |
| `pnpm e2e` | Recorrido Playwright contra la API real (ver `e2e/README.md`) |

## Rutas

| Ruta | Pantalla | Datos |
|---|---|---|
| `/` | Portada cinematográfica | Estática; los botones dependen de la sesión |
| `/sign-in` | Entrar (+ cuenta demo en un clic) | Better Auth |
| `/sign-up` | Crear cuenta | Better Auth |
| `/forgot-password` | Pedir enlace de recuperación | Better Auth |
| `/reset-password?token=…` | Nueva contraseña | Better Auth |
| `/dashboard` | **El estudio**: ideas, progreso y agenda | `GET /api/ideas`, `POST /api/ideas` |
| `/ideas/[id]` | **Workspace**: conversación, propuestas y plan | `GET /api/ideas/:id`, mensajes, extracciones y propuestas |
| `/profile` | Cuenta: exportar, reiniciar demo, perfil, contraseña, eliminar | Better Auth, `/api/account/export`, `/api/demo/reset` |

Las rutas de `(app)` se protegen con un guard de cliente (`useRequireSession`)
solo por comodidad de navegación: **la autorización la hace siempre la API**,
que responde `401` sin cookie.

## Estructura

```
Frontend/
├── e2e/                 Recorrido Playwright contra la API real
├── playwright.config.ts
├── public/
│   ├── fonts/           Inter + Instrument Serif (OFL), servidas localmente
│   └── images/          Fotografía etalonada para la paleta del estudio
├── docs/                Documentación del cliente
└── src/
    ├── app/
    │   ├── layout.tsx       Raíz: fuentes, script de movimiento, "saltar al contenido"
    │   ├── globals.css      Sistema de diseño: tokens @theme y reglas globales
    │   ├── page.tsx         Portada
    │   ├── not-found.tsx
    │   ├── error.tsx, global-error.tsx   Fallos inesperados (Next 16: `retry`)
    │   ├── (auth)/          sign-in, sign-up, forgot-password, reset-password
    │   └── (app)/           layout (guard + cabecera), template (transición),
    │                        dashboard, ideas/[id], profile
    ├── components/
    │   ├── ui/              Primitivas: button, field, alert, progress,
    │   │                    skeleton, modal, status-tag
    │   ├── motion/          Integración con Anime.js: useAnimeScope,
    │   │                    entrada cinematográfica, foto, revelados, transición
    │   ├── brand/           Logotipo
    │   ├── navigation/      Cabeceras pública y del estudio, AppShell
    │   ├── landing/         Hero de la portada
    │   ├── auth/            AuthShell y formularios
    │   ├── dashboard/       Estudio: lista editorial, búsqueda y filtro,
    │   │                    marcas por dimensión, estado vacío, nueva idea
    │   ├── workspace/       useWorkspace, conversación en burbujas, bienvenida
    │   │                    del coach, compositor, propuestas, plan, lienzo,
    │   │                    árbol, trazabilidad y aviso sin conexión
    │   └── profile/         Cuenta
    └── lib/                 Lógica sin JSX (testeada)
        ├── api.ts           ÚNICO punto de contacto con la API
        ├── stream.ts        Lectura del stream de texto plano del coach
        ├── auth-client.ts   Cliente Better Auth + traducción de errores
        ├── session.ts       Guards de sesión y `next` seguro
        ├── dimensions.ts    Copia de las 10 dimensiones y su vista
        ├── graph.ts         Aplicar respuestas del servidor al grafo local
        ├── format.ts        Fechas, porcentajes, plurales
        ├── headline.ts      Titulares con palabras de acento
        ├── rich-text.ts     Texto del coach → bloques (sin HTML)
        ├── covers.ts        Portada fotográfica estable por idea
        ├── ideas-filter.ts  Buscar y filtrar ideas del dashboard
        ├── canvas.ts        Proyección del lienzo (Lean Canvas)
        ├── motion.ts        Easings, duraciones, reduced motion
        ├── shortcuts.ts     Catálogo y reglas de los atajos de teclado
        ├── drafts.ts        Borrador sin enviar por idea (localStorage)
        ├── onboarding.ts    Pasos y recuerdo de la guía
        ├── timeline.ts      Proyección de la línea de tiempo
        ├── config.ts        URL de la API y cuenta demo
        └── cn.ts
```

**Regla de dependencias:** `app/` compone `components/`; `components/` usa
`lib/`; `lib/` usa `@bid/core`. Nada importa de `apps/api`.

## Tests

`pnpm test` ejecuta 118 tests (sin navegador real ni red). En `src/lib`:

- `api.test.ts` — cookie en cada request, nunca `ownerId`, mensajes de error de
  la API, `sendMessage` falla **antes** del stream, 429 de extracción como
  cuota anunciada, `content` solo al corregir, 403 del reset de demo.
- `stream.test.ts` — acumulación por chunks y caracteres multibyte partidos.
- `dimensions.test.ts` — un nodo `inferred` **nunca** cuenta como validado;
  temas de la bienvenida del coach.
- `starters.test.ts` — cada frase de arranque de la bienvenida coincide con el
  patrón del extractor para su dimensión.
- `graph.test.ts` — el grafo local solo cambia con el nodo que devolvió la API.
- `studio.test.ts` — búsqueda y filtro del dashboard, marcas por dimensión desde
  la agenda y la proyección del lienzo (cada dimensión una vez, áreas válidas).
- `text.test.ts` — titulares, texto enriquecido, formato, `next` seguro, portadas.

- `drafts.test.ts`, `shortcuts.test.ts`, `timeline.test.ts` — borradores,
  atajos y línea de tiempo.

Componentes (jsdom + Testing Library): `proposal-card.test.tsx`,
`composer.test.tsx`, `idea-filters.test.tsx`.

`pnpm e2e` recorre la app contra la API real con Playwright (ver
[`e2e/README.md`](e2e/README.md)).

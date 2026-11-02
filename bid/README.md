# BID

Coach conversacional que ayuda a un emprendedor a cimentar e iniciar su idea de
negocio.

El usuario conversa en lenguaje natural. El sistema extrae estructura de esa
conversación y la proyecta en visualizaciones que muestran qué tan sólida está
la idea y qué falta.

> **Estado:** cimiento. El modelo de dominio y las proyecciones están
> implementados y testeados. Persistencia, autenticación, IA y UI todavía no.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS 4 |
| Tests | Vitest |
| Base de datos | Postgres *(pendiente)* |
| IA | Proveedor por definir *(pendiente)* |

## Empezar

Este proyecto usa **pnpm**. Node ya no incluye corepack, así que hay que
instalarlo una vez:

```bash
npm install -g pnpm
```

Después:

```bash
pnpm install
pnpm dev         # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Servir el build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm test` | Tests una vez |
| `pnpm test:watch` | Tests en modo watch |

> **No uses `npm install` en este repo.** El lockfile es `pnpm-lock.yaml`;
> npm lo ignora, genera un árbol distinto y rompe la reproducibilidad.

## Estructura

```
src/
├── app/            Next.js: rutas y UI
├── application/    Casos de uso
├── domain/         Modelo canónico y proyecciones (puro)
└── infrastructure/ Adaptadores: base de datos, IA, auth
```

La regla de dependencia y el patrón de proyecciones están explicados en
[`docs/arquitectura.md`](docs/arquitectura.md).

## Documentación

- [`docs/guia-del-proyecto.md`](docs/guia-del-proyecto.md) — **empezá por acá**:
  estado, cómo ejecutarlo, qué hay dentro y qué sigue.
- [`docs/especificacion-funcional.md`](docs/especificacion-funcional.md) —
  requisitos, decisiones de producto y alcance.
- [`docs/arquitectura.md`](docs/arquitectura.md) — capas, patrón de diseño y
  convenciones.
- [`docs/memoria-del-proyecto.md`](docs/memoria-del-proyecto.md) — registro de
  decisiones y descubrimientos exportado desde Engram.
- [`docs/engram/`](docs/engram/README.md) — export nativo para importar la
  memoria del proyecto en otro entorno.

## Idea central

Una idea se modela **una sola vez** como un grafo de diez dimensiones. Cada
metodología (árbol, card, canvas) es una **proyección pura** sobre ese grafo.

```
Conversación ──extracción──▶ MODELO CANÓNICO ──proyección──▶ Árbol / Card / Canvas
```

Agregar una metodología nueva es escribir una función, no migrar datos. Y como
el historial se guarda sobre el grafo, todas las vistas lo heredan.

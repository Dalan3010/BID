# BID

Coach conversacional que ayuda a un emprendedor a cimentar e iniciar su idea de
negocio.

El usuario conversa en lenguaje natural. El sistema extrae estructura de esa
conversación y la proyecta en visualizaciones que muestran qué tan sólida está
la idea y qué falta.

> **Estado:** Fase 5. Este repositorio publica la parte cliente del producto: el
> dominio compartido y la aplicación Next.js, implementados y testeados. El
> cliente habla por HTTP con la API del proyecto, que no forma parte de este
> repositorio.

## Stack

| Capa | Tecnología |
|---|---|
| Dominio compartido | TypeScript puro (`@bid/core`), sin dependencias de runtime |
| Cliente | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS 4 |
| Animación | Anime.js 4 |
| Tests | Vitest |
| Vista árbol | React Flow (@xyflow/react) |

## Dominio y cliente

El repositorio es un **workspace pnpm** con dos paquetes:

```
packages/core/   Dominio puro: modelo canónico, merge y proyecciones
Frontend/        Next.js. Solo cliente: no toca la base ni importa la API
```

El cliente y la API se comunican **por HTTP**, y comparten únicamente los tipos y
las proyecciones puras de `@bid/core`. La sesión vive en una cookie httpOnly que
emite la API.

La regla de dependencia y el patrón de proyecciones están explicados en
[`docs/arquitectura.md`](docs/arquitectura.md).

## Empezar

Este proyecto usa **pnpm**. Node ya no incluye corepack, así que hay que
instalarlo una vez:

```bash
npm install -g pnpm
```

Después:

```bash
pnpm install
cp .env.example .env.local
pnpm dev                  # cliente en http://localhost:3000
```

El cliente necesita una API escuchando en `NEXT_PUBLIC_API_URL` (por defecto
`http://localhost:3001`).

Hay **un solo `.env.local`**, en la raíz: `Frontend/next.config.ts` lo carga con
`loadEnvConfig`, así que `NEXT_PUBLIC_API_URL` se declara una vez.

| Script | Qué hace |
|---|---|
| `pnpm dev` | Levanta el cliente |
| `pnpm build` | Build de producción del cliente |
| `pnpm start` | Sirve el build del cliente |
| `pnpm lint` | ESLint (solo `Frontend`) |
| `pnpm typecheck` | TypeScript sin emitir, en los dos paquetes |
| `pnpm test` | Tests una vez |

> **No uses `npm install` en este repo.** El lockfile es `pnpm-lock.yaml`;
> npm lo ignora, genera un árbol distinto y rompe la reproducibilidad.

## Entrar

`/sign-in` tiene un botón **Entrar con la cuenta demo**: entra sin tipear nada y
muestra la idea de ejemplo completa. Requiere una API con la cuenta demo
sembrada (`demo@bid.local` / `demo1234`).

## Estructura

```
packages/core/src/
├── idea/               Modelo canónico, merge y proyecciones (puro)
└── chat/               Tipos de la conversación

Frontend/src/
├── app/                Rutas: portada, (auth), (app)
├── components/         ui, motion (Anime.js), navegación y una carpeta por pantalla
└── lib/                Cliente HTTP, stream, sesión, dimensiones (sin JSX, testeado)
```

El cliente está documentado en [`Frontend/README.md`](Frontend/README.md):
arquitectura e integración con cada endpoint, sistema de diseño, catálogo de
animaciones y limitaciones del backend encontradas al integrarlo.

## Documentación

- [`docs/guia-del-proyecto.md`](docs/guia-del-proyecto.md) — **empezá por acá**:
  estado, cómo ejecutarlo, qué hay dentro y qué sigue.
- [`docs/roadmap.md`](docs/roadmap.md) — fases de construcción, criterios de
  aceptación y qué recortar si el tiempo aprieta.
- [`docs/especificacion-funcional.md`](docs/especificacion-funcional.md) —
  requisitos, decisiones de producto y alcance.
- [`docs/arquitectura.md`](docs/arquitectura.md) — capas, patrón de diseño y
  convenciones.
- [`docs/memoria-del-proyecto.md`](docs/memoria-del-proyecto.md) — registro de
  decisiones y descubrimientos exportado desde Engram.
- [`docs/engram/`](docs/engram/README.md) — export nativo para importar la
  memoria del proyecto en otro entorno.
- [`Frontend/README.md`](Frontend/README.md) — el cliente "BID Creative
  Studio": rutas, estructura, diseño, movimiento y verificación.

## Las dos vistas

La idea se ve de dos maneras y salen de la misma fuente: la **card** apila las
diez dimensiones con su estado, y el **árbol** las muestra como jerarquía, de
qué depende cada decisión. Una dimensión abierta tiene borde punteado; una
completa, borde sólido.

Ninguna de las dos puede discrepar de la otra: las dos leen el mismo grafo y
calculan el estado con las mismas proyecciones puras.

## Idea central

Una idea se modela **una sola vez** como un grafo de diez dimensiones. Cada
metodología (árbol, card, canvas) es una **proyección pura** sobre ese grafo.

```
Conversación ──extracción──▶ MODELO CANÓNICO ──proyección──▶ Árbol / Card / Canvas
```

Agregar una metodología nueva es escribir una función, no migrar datos. Y como
el historial se guarda sobre el grafo, todas las vistas lo heredan.

## La IA propone, no escribe

Cada pieza de conocimiento declara su procedencia: `inferred` (lo propuso la IA),
`confirmed` (lo validó la persona) o `edited` (lo escribió a mano). La
precedencia es `edited > confirmed > inferred`, y esa regla vive en una función
pura, no repartida en el código.

Un nodo `inferred` no cierra un hueco porque **es una pregunta, no una
respuesta**. Mientras no haya validación humana, el coach sigue insistiendo.

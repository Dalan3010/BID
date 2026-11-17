# BID

Coach conversacional que ayuda a un emprendedor a cimentar e iniciar su idea de
negocio.

El usuario conversa en lenguaje natural. El sistema extrae estructura de esa
conversación y la proyecta en visualizaciones que muestran qué tan sólida está
la idea y qué falta.

> **Estado:** Fase 5. Dominio, API y cliente están implementados y testeados:
> persistencia, autenticación, las dos vistas del grafo, el chat con streaming y
> la extracción de la conversación a nodos. Falta el historial de versiones y el
> modo demo.

## Stack

| Capa | Tecnología |
|---|---|
| Dominio compartido | TypeScript puro (`@bid/core`), sin dependencias de runtime |
| API | Hono + `@hono/node-server` |
| Cliente | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS 4 |
| Animación | Anime.js 4 |
| Tests | Vitest, por paquete |
| Base de datos | Postgres 17 + Drizzle ORM |
| Autenticación | Better Auth |
| Vista árbol | React Flow (@xyflow/react) |
| IA | AI SDK · guion por defecto, proveedor opcional |

## Dominio, API y cliente

El repositorio es un **workspace pnpm** con tres paquetes:

```
packages/core/   Dominio puro: modelo canónico, merge y proyecciones
apps/api/        Hono. Es el único que habla con Postgres y con Better Auth
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
# En .env.local: BETTER_AUTH_SECRET=$(openssl rand -base64 32)
docker compose up -d      # Postgres en localhost:5432
pnpm db:migrate
pnpm db:seed              # idea demo + cuenta demo@bid.local / demo1234
pnpm dev                  # API en :3001 y cliente en :3000
```

`pnpm dev` levanta los dos procesos en paralelo. El cliente abre en
<http://localhost:3000> y la API escucha en <http://localhost:3001>.

Hay **un solo `.env.local`**, en la raíz, compartido por los dos: la API lo carga
con `tsx --env-file-if-exists` y el cliente con `loadEnvConfig` en
`Frontend/next.config.ts`. Así el `DATABASE_URL`, el secreto y el puerto se
declaran una vez.

| Script | Qué hace |
|---|---|
| `pnpm dev` | Levanta API y cliente en paralelo |
| `pnpm build` | Build de producción del cliente |
| `pnpm start` | Sirve el build del cliente |
| `pnpm lint` | ESLint (solo `Frontend`) |
| `pnpm typecheck` | TypeScript sin emitir, en los tres paquetes |
| `pnpm test` | Tests una vez (sin base de datos) |
| `pnpm test:watch` | Tests de la API en modo watch |
| `pnpm db:generate` | Genera una migración desde el esquema |
| `pnpm db:migrate` | Aplica las migraciones pendientes |
| `pnpm db:seed` | Siembra la idea demo y su cuenta |
| `pnpm mock:api` | API simulada en `http://localhost:3001` (solo para ver la UI) |
| `pnpm ui` | API simulada + cliente, para revisar la interfaz de punta a punta |

> **No uses `npm install` en este repo.** El lockfile es `pnpm-lock.yaml`;
> npm lo ignora, genera un árbol distinto y rompe la reproducibilidad.

## Ver la UI sin la API

La API vive en `apps/api`. Para revisar la interfaz sin levantar Postgres ni el
servidor real hay una API simulada, [`mock/server.mjs`](mock/server.mjs):

```bash
pnpm ui          # cliente en :3000 y mock en :3001
```

Responde el mismo contrato que `Frontend/src/lib/api.ts` y las rutas de Better
Auth, con datos en memoria. **No es un backend**: no hay base de datos, ni
autenticación real, ni IA. Cualquier correo y contraseña entran, el coach
responde con un guion y todo vuelve al estado inicial al reiniciar el proceso.
Sirve para revisar pantallas, no para probar seguridad ni persistencia.

## Entrar

`/sign-in` tiene un botón **Entrar con la cuenta demo**: entra sin tipear nada y
muestra la idea de ejemplo completa. Requiere una API con la cuenta demo
sembrada (`demo@bid.local` / `demo1234`).

## Estructura

```
packages/core/src/
├── idea/               Modelo canónico, merge y proyecciones (puro)
└── chat/               Tipos de la conversación

apps/api/
├── drizzle/            Migraciones SQL versionadas
└── src/
    ├── app.ts          App Hono: CORS, errores y rutas
    ├── routes/         ideas, messages, extractions, proposals, account, demo
    ├── application/    Casos de uso y puertos
    └── infrastructure/ Auth (Better Auth), base de datos (Drizzle) e IA

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
- [`docs/HANDOVER/`](docs/HANDOVER/00_INDICE.md) — onboarding, contratos de la
  API, datos, validaciones, despliegue y checklist de entrega.
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

# BID

Coach conversacional que ayuda a un emprendedor a cimentar e iniciar su idea de
negocio.

El usuario conversa en lenguaje natural. El sistema extrae estructura de esa
conversación y la proyecta en visualizaciones que muestran qué tan sólida está
la idea y qué falta.

> **Estado:** el **backend** está completo para usar el producto sin IA: autoría
> manual de nodos, alta, renombre, resumen y borrado de ideas, historial de
> versiones con diff y un mapeo de errores honesto. 145 tests verdes contra
> Postgres. La **UI** todavía no expone esa autoría ni el historial —el plan se
> ve en modo lectura— y el mock no replica aún los endpoints nuevos.

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

## Levantar el proyecto completo

Camino corto, desde cero: **cinco pasos**. Abajo están los requisitos, la
verificación y los problemas típicos.

| Querés… | Camino |
|---|---|
| El producto completo: Postgres, API real y cliente | pasos 1 a 5 |
| Sólo mirar la UI, sin base de datos | `pnpm ui` (ver [Ver la UI sin la API](#ver-la-ui-sin-la-api)) |

### Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20.9 o superior (probado con 26) | API, cliente y scripts |
| pnpm | 11 (la fija `packageManager`) | workspace y scripts de la raíz |
| Docker con Compose v2 | — | Postgres local; si no tenés Docker, cualquier Postgres sirve |

Node ya no incluye corepack, así que pnpm se instala una vez:

```bash
npm install -g pnpm
```

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Crear `.env.local`

Hay **un solo `.env.local`**, en la raíz, compartido por la API y el cliente: la
API lo carga con `tsx --env-file-if-exists` y el cliente con `loadEnvConfig` en
`Frontend/next.config.ts`. Por eso `DATABASE_URL`, el secreto y los puertos se
declaran una sola vez.

```bash
cp .env.example .env.local
openssl rand -hex 32   # pegá el resultado en BETTER_AUTH_SECRET
```

O en un solo paso:

```bash
cp .env.example .env.local && \
  sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -hex 32)|" .env.local
```

`BETTER_AUTH_SECRET` **no es opcional**: sin él la sesión no se firma y el login
falla. Las demás variables ya vienen con valores locales correctos; con
`COACH_PROVIDER=rehearsal` (el default) el coach responde con un guion y **no
necesitás ninguna API key**.

### 3. Levantar Postgres

```bash
docker compose up -d
docker compose ps          # bid-postgres … (healthy)
```

El contenedor crea dos bases: `bid` (desarrollo) y `bid_test` (tests de
integración), y publica el `5432` en `localhost`.

### 4. Aplicar el esquema y sembrar la demo

```bash
pnpm db:migrate            # Migrations applied.
pnpm db:seed               # Demo idea seeded.
```

El seed deja la idea de ejemplo completa y la cuenta
`demo@bid.local` / `demo1234`, con 4 ideas y 10 nodos confirmados. Se puede
volver a correr: restaura el estado y la contraseña de la cuenta demo.

### 5. Levantar API y cliente

```bash
pnpm dev
```

Levanta los dos procesos en paralelo: la API en
<http://localhost:3001> y el cliente en <http://localhost:3000>. El primer
arranque del cliente tarda unos segundos porque compila.

### Verificar que quedó arriba

| Qué | Cómo | Esperado |
|---|---|---|
| API viva | `curl -s http://localhost:3001/api/health` | `{"ok":true}` |
| Cliente | abrir <http://localhost:3000> | portada de BID |
| Base conectada | `docker compose ps` | `bid-postgres … (healthy)` |
| Login | `/sign-in` → botón de cuenta demo | dashboard con las 4 ideas sembradas |
| Sesión manual | `demo@bid.local` / `demo1234` | el mismo dashboard |

### Variables de `.env.local`

| Variable | Valor local | Para qué |
|---|---|---|
| `DATABASE_URL` | `postgres://bid:bid@127.0.0.1:5432/bid` | Postgres de desarrollo |
| `BETTER_AUTH_SECRET` | generado con `openssl` | firma de la sesión (obligatorio) |
| `BETTER_AUTH_URL` | `http://localhost:3001` | origen que emite la cookie |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | a dónde apunta el cliente |
| `WEB_ORIGIN` | `http://localhost:3000` | único origen aceptado por CORS |
| `COACH_PROVIDER` | `rehearsal` | coach con guion, sin API key |
| `TEST_DATABASE_URL` | `postgres://bid:bid@127.0.0.1:5432/bid_test` | habilita los tests con base |

### Problemas típicos

| Síntoma | Causa | Solución |
|---|---|---|
| `failed to connect to the docker API … /var/run/docker.sock` | el daemon no está corriendo (el CLI sí puede estar instalado) | `sudo systemctl start docker` y reintentar |
| `Conflict. The container name "/bid-postgres" is already in use` | quedó un contenedor de otro checkout | `docker rm -f bid-postgres` (el volumen no se borra) |
| `port is already allocated` en `5432` | otro Postgres usa el puerto | `docker compose down` o cambiá el mapeo en `compose.yaml` |
| El login falla siempre | falta `BETTER_AUTH_SECRET` | generarlo y reiniciar `pnpm dev` |
| `pnpm test` saltea los tests de base | falta `TEST_DATABASE_URL` | exportarla antes de correr los tests |
| Cambié un endpoint y el cliente no reacciona | el cliente compila con Turbopack cacheado | reiniciar `pnpm dev` |

### Scripts

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

### Tests

```bash
pnpm typecheck    # TypeScript en core, api y Frontend
pnpm test         # suite completa, sin base de datos
```

Los tests de integración contra Postgres están **apagados por defecto**. Con el
contenedor de `compose.yaml` levantado, la base `bid_test` ya existe:

```bash
TEST_DATABASE_URL=postgres://bid:bid@127.0.0.1:5432/bid_test pnpm test
```

Ese `TEST_DATABASE_URL` tiene que venir del entorno del proceso: Vitest no lee
`.env.local`. Con la variable puesta, la suite de la API corre **145 tests y no
saltea ninguno**; sin ella, saltea los 14 que necesitan base.

Si tu Postgres no es el del `compose.yaml`, creá `bid_test` a mano: los tests
aplican las migraciones solos.

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

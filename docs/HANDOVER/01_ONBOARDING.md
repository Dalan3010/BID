# Onboarding

Todo lo necesario para levantar el proyecto desde cero.

## 1. Requisitos

| Herramienta | Versión | Nota |
|---|---|---|
| Node.js | 20 o superior (probado con 26) | El repo usa ESM (`"type": "module"`) |
| pnpm | 11.x | Fijado en `package.json`: `packageManager: pnpm@11.21.0` |
| Docker + Docker Compose | Cualquier versión reciente | Solo para Postgres local |
| Postgres | 17 | Se usa la imagen `postgres:17-alpine` del compose |

> Node ya no incluye Corepack. Instalá pnpm una vez:
>
> ```bash
> npm install -g pnpm
> ```

## 2. Instalación

```bash
git clone <repo>
cd PWeb
pnpm install
```

## 3. Variables de entorno

Hay **un solo archivo `.env.local` en la raíz**, compartido por API y cliente:

- La API lo carga con `tsx --env-file-if-exists=../../.env.local`.
- El cliente lo carga desde `Frontend/next.config.ts` con `loadEnvConfig`.

```bash
cp .env.example .env.local
```

### Variables obligatorias

| Variable | Ejemplo | Para qué |
|---|---|---|
| `DATABASE_URL` | `postgres://bid:bid@localhost:5432/bid` | Conexión a Postgres |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | Firma de sesiones y tokens |
| `BETTER_AUTH_URL` | `http://localhost:3001` | Origen propio de la API |
| `WEB_ORIGIN` | `http://localhost:3000` | Único origen permitido por CORS y confiado por Better Auth |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Se incrusta en el bundle del cliente **en build time** |
| `API_PORT` | `3001` | Puerto de la API |

Generar el secreto:

```bash
openssl rand -base64 32
```

### Variables opcionales

| Variable | Default | Para qué |
|---|---|---|
| `COACH_PROVIDER` | `rehearsal` | `rehearsal` = guion; `live` = Google |
| `COACH_MODEL` | `gemini-3.5-flash-lite` | Modelo del coach |
| `EXTRACTOR_MODEL` | `gemini-3.5-flash-lite` | Modelo del extractor |
| `GOOGLE_GENERATIVE_AI_API_KEY` | vacío | Necesaria si `COACH_PROVIDER=live` |
| `COACH_QUOTA` | `50` | Llamadas por idea antes de avisar del límite |
| `AUTH_LOG_SECRETS` | `0` | `1` loguea links con token (solo desarrollo) |
| `AUTH_COOKIE_SAMESITE` | `lax` | `none` si API y web están en dominios distintos (requiere HTTPS) |
| `DEMO_MODE` | `false` | Reservado |

> **Nunca** subas `.env.local`. Está en `.gitignore`.

## 4. Base de datos

```bash
docker compose up -d      # Postgres en localhost:5432
pnpm db:migrate           # aplica migraciones Drizzle
pnpm db:seed              # idea demo + cuenta demo
```

El contenedor crea además la base `bid_test` la primera vez (ver
[`docker/postgres-init.sql`](../../docker/postgres-init.sql)).

### Credenciales demo

| Campo | Valor |
|---|---|
| Email | `demo@bid.local` |
| Contraseña | `demo1234` |

El seed es **idempotente**: correrlo dos veces deja el mismo estado.

## 5. Arrancar

```bash
pnpm dev
```

| Proceso | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (Hono) | http://localhost:3001 |

`pnpm dev` ejecuta `pnpm -r --parallel dev`, así que levanta los dos a la vez.

### Arrancar por separado

```bash
pnpm --filter @bid/api dev
pnpm --filter @bid/web dev
```

## 6. Scripts disponibles

Desde la raíz:

| Script | Qué hace |
|---|---|
| `pnpm dev` | API + web en paralelo |
| `pnpm build` | Build de producción del cliente |
| `pnpm start` | Sirve el build del cliente |
| `pnpm lint` | ESLint (solo `Frontend`) |
| `pnpm typecheck` | `tsc --noEmit` en todos los paquetes |
| `pnpm test` | Vitest en todos los paquetes |
| `pnpm test:watch` | Vitest en modo watch (API) |
| `pnpm db:generate` | Genera migración Drizzle desde el schema |
| `pnpm db:migrate` | Aplica migraciones |
| `pnpm db:seed` | Siembra la demo |

## 7. Estructura del repo

```text
.
├── apps/
│   ├── api/                 # Hono + Postgres + Better Auth + IA
│   │   └── src/
│   │       ├── application/ # casos de uso y puertos (sin infraestructura)
│   │       ├── infrastructure/
│   │       │   ├── ai/      # coach, extractor, fallback, quota
│   │       │   ├── auth/    # Better Auth
│   │       │   └── db/      # Drizzle: schema, repositorios, seed
│   │       ├── lib/         # body, errores, sesión, params
│   │       └── routes/      # ideas, messages, extractions, proposals…
│   └── web/                 # Next.js 16 (App Router)
│       └── src/
│           ├── app/         # rutas y páginas
│           ├── components/  # UI compartida
│           └── lib/         # cliente HTTP, dimensiones
├── packages/
│   └── core/                # dominio puro: tipos, merge, proyecciones
├── docker/
│   └── postgres-init.sql
├── docs/
│   ├── HANDOVER/            # esta documentación
│   └── *.md                 # arquitectura, especificación, roadmap
├── compose.yaml
└── package.json
```

## 8. Troubleshooting

### `EADDRINUSE` en 3000 o 3001

Hay un proceso anterior vivo. Identificalo y matalo:

```bash
ss -tlnp | grep -E ':(3000|3001)'
kill <PID>
```

En Windows:

```powershell
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### `Another next dev server is already running`

Next.js 16 bloquea dos `next dev` sobre el mismo directorio. Cerrá el anterior o
usá el puerto que te indica.

### Error de conexión a Postgres

```bash
docker compose ps
docker compose logs postgres
```

Si el volumen quedó corrupto:

```bash
docker compose down -v   # OJO: borra los datos
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

### El login no mantiene la sesión

- Revisá que `WEB_ORIGIN` coincida exactamente con la URL del navegador.
- Si API y web están en dominios distintos, `AUTH_COOKIE_SAMESITE=none` y HTTPS.
- Borrá cookies de `localhost` y volvé a entrar.

### La IA no responde / error de cuota

Con `COACH_PROVIDER=rehearsal` no hace falta ninguna API key. Con `live`:

- Verificá `GOOGLE_GENERATIVE_AI_API_KEY`.
- Si el proveedor falla, el sistema **cae automáticamente al guion** y la
  conversación sigue. Es el comportamiento esperado (RF-72).

### `pnpm db:migrate` falla por tabla existente

El proyecto no usa `drizzle-kit push` en producción. Si la base quedó en un
estado intermedio, recreá el volumen (ver arriba) y volvé a migrar.

### El cliente no ve la API

`NEXT_PUBLIC_API_URL` se incrusta en **build time**. Si la cambiaste, hay que
reconstruir:

```bash
pnpm build
pnpm start
```

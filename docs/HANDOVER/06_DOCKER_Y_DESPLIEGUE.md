# Docker y despliegue

## 1. Qué hay hoy

| Archivo | Contenido |
|---|---|
| [`compose.yaml`](../../compose.yaml) | Servicio `postgres` (Postgres 17) para desarrollo |
| [`docker/postgres-init.sql`](../../docker/postgres-init.sql) | Crea la base `bid_test` la primera vez |

> **Importante:** hoy **no existe un `Dockerfile` para la aplicación**. Docker
> solo se usa para levantar Postgres en local. La app corre con `pnpm dev` o
> `pnpm build && pnpm start` sobre Node.

## 2. `compose.yaml` en detalle

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: bid-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: bid
      POSTGRES_PASSWORD: bid
      POSTGRES_DB: bid
    ports:
      - "5432:5432"
    volumes:
      - bid-postgres-data:/var/lib/postgresql/data
      - ./docker/postgres-init.sql:/docker-entrypoint-initdb.d/10-bid-test.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bid -d bid"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  bid-postgres-data:
```

| Elemento | Valor | Nota |
|---|---|---|
| Imagen | `postgres:17-alpine` | Alineada con la versión objetivo |
| Usuario / contraseña / DB | `bid` / `bid` / `bid` | **Solo local**; nunca en producción |
| Puerto | `5432` | Coincide con `DATABASE_URL` del `.env.example` |
| Volumen de datos | `bid-postgres-data` | Persiste entre reinicios |
| Init SQL | `10-bid-test.sql` | Crea `bid_test` para tests de integración |
| Healthcheck | `pg_isready` | Útil para esperar antes de migrar |

### Credenciales

```text
postgres://bid:bid@localhost:5432/bid
```

> Estas credenciales son deliberadamente triviales. **Nunca** deben usarse fuera
> de `localhost`.

## 3. Flujo local completo

```bash
# 1. Dependencias
pnpm install

# 2. Entorno
cp .env.example .env.local
# editar BETTER_AUTH_SECRET

# 3. Base de datos
docker compose up -d
pnpm db:migrate
pnpm db:seed

# 4. Aplicación
pnpm dev
```

| Servicio | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Postgres | localhost:5432 |

## 4. Comandos de Docker útiles

```bash
docker compose up -d          # levantar en background
docker compose ps             # estado
docker compose logs -f postgres
docker compose stop           # detener sin borrar datos
docker compose down           # detener y borrar contenedor (conserva volumen)
docker compose down -v        # OJO: borra también los datos
```

### Acceder a psql

```bash
docker exec -it bid-postgres psql -U bid -d bid
```

### Recrear desde cero

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

## 5. Migraciones y seed

```bash
pnpm db:generate   # genera SQL desde schema.ts
pnpm db:migrate    # aplica migraciones
pnpm db:seed       # siembra la demo (idempotente)
```

Migraciones actuales:

```text
apps/api/drizzle/0000_high_morlun.sql
apps/api/drizzle/0001_violet_micromacro.sql
```

Configuración: `apps/api/drizzle.config.ts`.

## 6. Build de producción

Hoy el build es solo del cliente:

```bash
pnpm build     # next build
pnpm start     # next start
```

La API se ejecuta con `tsx`:

```bash
pnpm --filter @bid/api start
```

> `tsx` ejecuta TypeScript directamente. Para producción real conviene compilar a
> JS o usar un runtime que lo soporte.

## 7. Si querés dockerizar la app

No está hecho, pero el camino es directo. Un `Dockerfile` multi-stage para el
monorepo:

```dockerfile
# --- deps ---
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile

# --- build ---
FROM deps AS build
COPY . .
RUN pnpm build

# --- runtime web ---
FROM node:22-alpine AS web
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@bid/web", "start"]

# --- runtime api ---
FROM node:22-alpine AS api
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3001
CMD ["pnpm", "--filter", "@bid/api", "start"]
```

Consideraciones al dockerizar:

| Punto | Detalle |
|---|---|
| `NEXT_PUBLIC_API_URL` | Se incrusta **en build time**: hay que pasarla como `ARG`/`ENV` en la etapa de build |
| `DATABASE_URL` | En runtime; el host pasa de `localhost` a `postgres` (nombre del servicio) |
| `WEB_ORIGIN` | Debe ser el origen público real del cliente |
| `BETTER_AUTH_URL` | Debe ser el origen público real de la API |
| HTTPS | Obligatorio si `AUTH_COOKIE_SAMESITE=none` |
| Migraciones | Ejecutar `pnpm db:migrate` antes de arrancar la API |
| Volumen | `bid-postgres-data` debe persistir |

## 8. Checklist de despliegue

- [ ] `BETTER_AUTH_SECRET` generado y **distinto** al de desarrollo
- [ ] `DATABASE_URL` apuntando a la base real (con SSL si aplica)
- [ ] `WEB_ORIGIN` y `BETTER_AUTH_URL` con los orígenes públicos
- [ ] `NEXT_PUBLIC_API_URL` correcta **antes** del build
- [ ] `COACH_PROVIDER=live` y `GOOGLE_GENERATIVE_AI_API_KEY` configurada (o
      `rehearsal` si se quiere demo sin proveedor)
- [ ] `AUTH_LOG_SECRETS=0` en producción
- [ ] `AUTH_COOKIE_SAMESITE=none` solo con HTTPS
- [ ] Migraciones aplicadas
- [ ] HTTPS en ambos servicios
- [ ] `POST /api/health` responde `{ "ok": true }`
- [ ] Login demo funciona
- [ ] Un mensaje al coach responde (con streaming)

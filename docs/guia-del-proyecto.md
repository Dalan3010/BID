# Guía del proyecto

Todo lo necesario para entender, ejecutar y continuar este repositorio sin
contexto previo.

---

## 1. Qué es

**BID** es una aplicación web que funciona como **coach** para ayudar a un
emprendedor a cimentar e iniciar su idea de negocio.

El usuario conversa en lenguaje natural. El sistema extrae estructura de esa
conversación y la proyecta en visualizaciones (árbol, card, canvas) que muestran
qué tan sólida está la idea y qué falta.

La idea central: **el valor no está en la conversación, está en que el sistema
recuerde, ordene y devuelva un plan.**

---

## 2. Estado actual

El repositorio contiene la **aplicación completa hasta la Fase 5**: el modelo
de dominio, el patrón de diseño, la persistencia, la autenticación, las dos
vistas del grafo, el chat con streaming y la extracción de la conversación a
nodos. Falta el historial de versiones y el modo demo.

### Implementado

| Elemento | Dónde |
|---|---|
| Monorepo pnpm: dominio, API y cliente | `packages/core/`, `apps/api/`, `Frontend/` |
| Modelo canónico de una idea (10 dimensiones) | `packages/core/src/idea/types.ts` |
| Proyecciones puras: huecos, completitud, árbol | `packages/core/src/idea/projections/` |
| Regla de merge `edited > confirmed > inferred` | `packages/core/src/idea/merge.ts` |
| Servidor Hono, CORS y cookie de sesión | `apps/api/src/app.ts`, `apps/api/src/routes/` |
| Esquema Postgres y migración versionada | `apps/api/src/infrastructure/db/schema.ts`, `apps/api/drizzle/` |
| Repositorio Drizzle + puerto | `apps/api/src/infrastructure/db/idea-repository.ts` |
| Casos de uso (crear, cargar, proponer, confirmar, editar, agenda, dueño) | `apps/api/src/application/use-cases/` |
| Autenticación con Better Auth sobre la tabla `users` | `apps/api/src/infrastructure/auth/` |
| Cliente HTTP tipado y sesión | `Frontend/src/lib/api.ts`, `Frontend/src/lib/auth-client.ts`, `use-session.ts` |
| Entrar, crear cuenta, recuperar contraseña | `Frontend/src/app/(auth)/` |
| Dashboard, perfil, exportación y borrado de cuenta | `Frontend/src/app/(app)/` |
| Seed de la idea demo (10 dimensiones, 0 huecos) | `apps/api/src/infrastructure/db/seed.ts` |
| Vista árbol (React Flow) derivada de `buildTree` | `Frontend/src/app/(app)/ideas/[id]/idea-tree/` |
| Vista card con el estado de las diez dimensiones | `Frontend/src/app/(app)/ideas/[id]/idea-card.tsx` |
| Layout del árbol como proyección pura y testeable | `packages/core/src/idea/projections/layout.ts` |
| Chat con streaming e historial por idea | `Frontend/src/app/(app)/ideas/[id]/chat/`, `apps/api/src/routes/messages.ts` |
| Puerto `CoachModel` con guion y con proveedor | `apps/api/src/application/ports/coach-model.ts`, `apps/api/src/infrastructure/ai/` |
| Puerto `Extractor` + esquema Zod de la propuesta | `apps/api/src/application/ports/extractor.ts`, `apps/api/src/infrastructure/ai/extraction-schema.ts` |
| Extracción con guion (patrones) y con proveedor | `apps/api/src/infrastructure/ai/rehearsal-extractor.ts`, `provider-extractor.ts` |
| Casos de uso de extracción y resolución de propuestas | `apps/api/src/application/use-cases/extract-knowledge.ts`, `resolve-proposal.ts` |
| Panel de propuestas (confirmar / corregir / descartar) | `Frontend/src/app/(app)/ideas/[id]/chat/proposal-panel.tsx` |
| Cuota de extracciones con aviso | `apps/api/src/infrastructure/ai/in-memory-usage-quota.ts` |
| 84 tests (28 del core, 56 de la API) | `*.test.ts` |
| Especificación funcional completa | `docs/especificacion-funcional.md` |
| Documento de arquitectura | `docs/arquitectura.md` |

### Deliberadamente no implementado

- Historial y diff entre versiones — Fase 6
- Rate limiting y bloqueo por intentos fallidos (RNF-03, RNF-04)
- Proveedor de modelo configurado (la app funciona con el guion)

El orden en que se construirán está en la sección 9.

---

## 3. Requisitos previos

| Herramienta | Versión | Nota |
|---|---|---|
| Node.js | 20 o superior | Probado con Node 26 |
| pnpm | 11.x | **No viene con Node** |
| Docker | cualquiera reciente | Solo para levantar Postgres en local |

Node ya no incluye corepack, así que pnpm se instala aparte:

```bash
npm install -g pnpm
```

---

## 4. Cómo ejecutarlo

```bash
unzip bid.zip
cd bid

pnpm install
cp .env.example .env.local
# En .env.local, generá un secreto de sesión:
#   openssl rand -base64 32
docker compose up -d      # Postgres en localhost:5432
pnpm db:migrate           # crea las tablas
pnpm db:seed              # siembra la idea demo y su cuenta
pnpm dev                  # API en :3001 y cliente en :3000
```

`pnpm dev` levanta los dos procesos en paralelo: el cliente en
<http://localhost:3000> y la API en <http://localhost:3001>. Si abrís solo el
cliente, vas a ver errores de red: la API tiene que estar arriba.

Hay **un solo `.env.local`**, en la raíz, compartido por los dos. La API lo carga
con `tsx --env-file-if-exists` y el cliente con `loadEnvConfig` desde
`Frontend/next.config.ts`, así que cada valor se declara una vez.

> **No uses `npm install` en este repositorio.** El lockfile es
> `pnpm-lock.yaml`. npm lo ignora, genera un árbol de dependencias distinto y
> rompe la reproducibilidad.

### La cuenta demo

`pnpm db:seed` crea la cuenta `demo@bid.local` con contraseña `demo1234` y la
idea de ejemplo completa. En `/sign-in` hay un botón que entra con un click.

Las credenciales son públicas a propósito: la cuenta solo contiene la idea
sembrada y la evaluación tiene que poder entrar sin tipear. El seed **restaura
la contraseña** si alguien la cambió, así que la demo nunca se queda sin
acceso.

> `BETTER_AUTH_SECRET` tiene que estar definido en `.env.local`. Sin él, la
> sesión no se firma y el login falla.

Si no tenés Docker, apuntá `DATABASE_URL` a cualquier Postgres accesible y
salteá el `docker compose`.

### Scripts disponibles

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta la API y el cliente en paralelo, con recarga |
| `pnpm build` | Build de producción del cliente |
| `pnpm start` | Sirve el build del cliente |
| `pnpm lint` | ESLint (solo `Frontend`) |
| `pnpm typecheck` | TypeScript sin emitir, en los tres paquetes |
| `pnpm test` | Tests una vez (no necesita base de datos) |
| `pnpm test:watch` | Tests de la API en modo watch |
| `pnpm db:generate` | Genera una migración nueva desde el esquema |
| `pnpm db:migrate` | Aplica las migraciones pendientes |
| `pnpm db:seed` | Siembra (o resiembra) la idea demo |

Los tests de integración contra Postgres están apagados por defecto. Para
correrlos:

```bash
TEST_DATABASE_URL=postgres://bid:bid@localhost:5432/bid_test pnpm test
```

La base `bid_test` la crea el contenedor la primera vez. Si tu Postgres no es el
del `compose.yaml`, creala a mano y aplicá las migraciones: los tests las corren
solos.

---

## 5. Qué hay dentro

```
bid/
├── .env.example              Plantilla de variables de entorno (sin secretos)
├── .gitignore                Excluye node_modules, .next, .env.local, artefactos
├── README.md                 Resumen y puesta en marcha
├── compose.yaml              Postgres local para desarrollo
├── package.json              Scripts del workspace (dev, test, db:*)
├── pnpm-lock.yaml            Lockfile (no editar a mano)
├── pnpm-workspace.yaml       Paquetes, build scripts permitidos y hoisting
├── docker/
│   └── postgres-init.sql     Crea la base de tests al inicializar el contenedor
├── docs/                     Especificación, arquitectura, roadmap y esta guía
├── odd/tasks/                Seguimiento de las fases en construcción
├── packages/core/            Dominio puro: modelo, merge, proyecciones, tests
├── apps/api/
│   ├── drizzle/              Migraciones SQL versionadas
│   ├── drizzle.config.ts     Configuración de Drizzle Kit
│   ├── vitest.config.mts     Configuración de los tests de la API
│   └── src/
│       ├── app.ts            App Hono: CORS, errores y montaje de rutas
│       ├── index.ts          Arranque del servidor
│       ├── routes/           ideas, messages, extractions, proposals, account
│       ├── application/      Casos de uso, puertos y repositorio en memoria
│       └── infrastructure/
│           ├── auth/         Better Auth sobre la tabla users
│           ├── db/           Esquema, cliente, repositorios, migración y seed
│           ├── ai/           Coach y extractor: guion y proveedor
│           └── container.ts  Composition root: qué implementación se usa
└── Frontend/
    ├── next.config.ts        Configuración de Next (carga el .env de la raíz)
    ├── eslint.config.mjs     Reglas de lint
    └── src/
        ├── app/
        │   ├── (auth)/       Rutas públicas: entrar, crear cuenta, recuperar
        │   ├── (app)/        Rutas protegidas: dashboard, idea, perfil
        │   └── page.tsx      Raíz: redirige a dashboard o a entrar
        ├── components/ui/    Primitivas de formulario y estados de carga
        └── lib/              Cliente HTTP, sesión y cliente de autenticación
```

---

## 6. Arquitectura en cinco minutos

### Dos aplicaciones y el dominio compartido

```
Frontend (Next.js) ──HTTP──▶ apps/api (Hono)
        │                          │
        └──────────┬───────────────┘
                   ▼
        packages/core (dominio puro)
```

El cliente y la API son procesos separados. `Frontend` no importa nada de
`apps/api` ni toca la base: habla por HTTP y comparte solo los tipos y las
proyecciones puras de `@bid/core`.

Dentro de la API, las capas mantienen la regla de siempre:

```
routes/  →  application/  →  packages/core
                                  ▲
infrastructure/ ──────────────────┘
```

Las flechas apuntan siempre hacia el dominio. **`packages/core` no importa nada
de las otras capas**: ni Next, ni React, ni base de datos, ni proveedor de IA.

### El patrón: proyecciones

Una idea se modela **una sola vez** como un grafo de diez dimensiones. Cada
metodología es una **función pura** sobre ese grafo.

```
                    ┌──────────────┐
                    │   IdeaGraph  │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      buildTree()     findGaps()     (canvas…)
        árbol          agenda         futuras
```

Consecuencias:

- Agregar una metodología nueva es escribir una función, no migrar datos.
- El historial se guarda sobre el grafo: todas las vistas lo heredan.
- Las proyecciones se testean con un objeto literal, sin base de datos.

### Procedencia de los nodos

Cada nodo declara de dónde salió:

| Fuente | Significado | ¿Cierra un hueco? |
|---|---|---|
| `inferred` | La IA lo propuso, el usuario no lo validó | No |
| `confirmed` | El usuario validó una propuesta | Sí |
| `edited` | El usuario lo escribió a mano | Sí |

**Precedencia de merge:** `edited` > `confirmed` > `inferred`.

Un nodo `inferred` no cierra un hueco porque **es una pregunta, no una
respuesta**. Mientras no haya validación humana, el coach sigue insistiendo.

### Una sola tabla de identidad

Better Auth no crea su propia tabla de usuarios: **reutiliza la tabla `users`
del dominio** (`user.modelName: "users"`). Por eso `ideas.owner_id` ya
apuntaba a `users` desde la Fase 1, y no hay dos lugares donde viva la
identidad de una persona.

### Aislamiento por dueño

Un caso de uso carga el grafo solo si el dueño coincide. La idea de otro
usuario devuelve **`IdeaNotFoundError`, no "prohibido"**: un 403 confirmaría que
esa idea existe y es de otra persona. Para un desconocido, una idea ajena y una
idea que nunca existieron se ven igual.

### La IA se usa solo donde hace falta

| Tarea | ¿Usa IA? |
|---|---|
| Conversar con el usuario | Sí |
| Extraer estructura de la conversación | Sí |
| Detectar qué dimensión falta | **No** — es una consulta determinística |

`findGaps` es una función pura: cuesta cero, no falla y es trivial de testear.

Conversar y extraer también son llamadas distintas, no dos partes de la misma
respuesta: el chat responde y, cuando termina, `POST /api/ideas/:id/extractions`
lee la conversación y propone nodos. Si la extracción falla o devuelve un JSON
inválido, el chat que el usuario está leyendo no se rompe y no se persiste
nada.

### La sesión es una cookie httpOnly

La API emite la cookie y el cliente no puede leerla: el navegador la adjunta a
cada request que pida credenciales, por eso el cliente usa
`credentials: "include"`. El cliente nunca decide autorización: cada ruta
protegida valida la sesión en la API contra el `ownerId` del recurso.

En localhost los dos puertos son mismo sitio, así que `SameSite=Lax` alcanza.
Con dos dominios distintos hay que usar `AUTH_COOKIE_SAMESITE=none` (cookie
`Secure`, requiere HTTPS).

---

## 7. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | Modelo canónico + proyecciones | Una sola fuente de verdad; agregar metodologías es barato |
| D2 | La IA propone, nunca escribe | La extracción es probabilística; el usuario valida |
| D3 | Edición directa solo en nodos `confirmed` | Equilibra control del usuario y protección contra sobreescritura |
| D4 | Procedencia obligatoria por nodo | Habilita confianza, trazabilidad e historial con un solo campo |
| D5 | Next.js 16 + Postgres + pnpm | Stack elegido; alternativa Vite + Hono evaluada y descartada |
| D6 | La IA son tres trabajos separados | Chat, extracción y detección de huecos tienen costos y modelos distintos |
| D7 | Estado actual relacional, historial en `jsonb` | La regla de merge es por nodo; el snapshot es por grafo |
| D8 | Better Auth reutiliza la tabla `users` | Una sola fuente de identidad; `ideas.owner_id` no cambia |

El detalle y el razonamiento completo están en
[`arquitectura.md`](./arquitectura.md) y en la sección 3 de
[`especificacion-funcional.md`](./especificacion-funcional.md).

---

## 8. Cómo verificar que funciona

```bash
pnpm typecheck    # los tres paquetes, sin salida = correcto
pnpm test         # 28 del core + 56 de la API = 84 passed
pnpm build        # compila el cliente y genera las rutas
pnpm lint         # ESLint sobre Frontend
```

Con la base levantada, además:

```bash
docker compose up -d
pnpm db:migrate   # "Migrations applied."
pnpm db:seed      # 10 nodos confirmados, gaps: 0, cuenta demo creada
```

El seed es idempotente: correrlo dos veces deja exactamente los mismos conteos.

Los tests de integración contra Postgres se activan aparte:

```bash
TEST_DATABASE_URL=postgres://bid:bid@localhost:5432/bid_test pnpm test
# suma los 8 tests de integración que sin base quedan en skipped
```

Todo debe pasar en una máquina limpia después de `pnpm install`. Si algo falla,
el problema es del entorno (versión de Node, pnpm o Postgres), no del código.

### Comprobación manual de la autenticación

```bash
pnpm dev     # deja la API en :3001 y el cliente en :3000
```

1. `http://localhost:3000` redirige a `/sign-in`.
2. `Entrar con la cuenta demo` entra sin tipear nada y muestra la idea al 100 %.
3. `/dashboard` sin sesión devuelve `307` a `/sign-in`.
4. `Olvidé mi contraseña` genera el enlace; aparece en la consola del servidor
   con la línea `[auth] password reset for ...`. Ese enlace abre el formulario
   de nueva contraseña.
5. En `/perfil`, `Descargar JSON` baja todo lo guardado desde la API y
   `Eliminar mi cuenta` borra la cuenta y las ideas.
6. En `/dashboard`, `Ver la idea` abre la card, el árbol y el chat de esa idea.
   En una idea nueva, las diez dimensiones aparecen abiertas y el coach
   pregunta por la primera.
7. En una idea nueva, contale al coach cómo cobrás ("cobro 30 por mes").
   Aparece el panel **Propuestas del coach** con un nodo `revenue` pendiente.
   Confirmalo: el panel desaparece, la dimensión pasa a completa y el árbol se
   actualiza sin recargar. Corregí otra propuesta y verificá que queda como
   `edited`; descartá una tercera y verificá que no queda nada.
8. Con `COACH_QUOTA=1 pnpm dev`, la segunda extracción avisa el límite en vez
   de fallar en silencio, y el chat sigue funcionando.

---

## 9. Qué sigue

Orden de construcción. **No se saltea el orden**: cada paso deja algo
demostrable. El detalle de cada fase, sus criterios de aceptación y qué recortar
si el tiempo aprieta está en [`roadmap.md`](./roadmap.md).

```
✅ 1. Modelo de datos + seed de la idea demo
✅ 2. Autenticación + cuenta demo
✅ 3. Vistas sobre el grafo (árbol, card) — sin IA, datos fijos
✅ 4. Chat con streaming — sin extracción todavía
✅ 5. Extracción + confirmación de nodos
   6. Historial + diff entre versiones
   7. Modo demo: fallback sin IA, reset, precalentado
```

La razón del orden: si el tiempo se acaba, en el paso 4 ya hay una demo que se
ve completa. Si se empieza por la IA y falla, no hay nada que mostrar.

El modo demo (paso 7) es prioritario porque la evaluación es una **demo en
vivo**: un fallo del proveedor de IA durante la presentación es un riesgo de
entrega, no un bug menor.

---

## 10. Convenciones

- **TypeScript estricto.** Sin `any` en el dominio.
- **Dominio puro.** Si un archivo en `packages/core` importa algo externo, es
  un error de arquitectura. Si `Frontend` importa algo de `apps/api`, también.
- **Idioma:** identificadores y comentarios de código en inglés; documentación
  en español.
- **Tests junto al código** (`*.test.ts`), no en un árbol paralelo.
- **Commits convencionales:** `feat:`, `fix:`, `docs:`, `chore:`. Sin
  atribución a herramientas.

---

## 11. Notas y limitaciones conocidas

- `next-env.d.ts` es generado por Next.js y está en `.gitignore`. No lo
  commitees.
- `AGENTS.md` lo genera `next dev` automáticamente y también está ignorado.
- El layout usa tipos explícitos de React en vez de `LayoutProps` generado, para
  que `pnpm typecheck` pase en un clon limpio sin haber corrido `next build`.
- No se usa `next/font`, para que el build no dependa de la red.
- Las variables de entorno viven en **un solo `.env.local` en la raíz**
  (ignorado). La plantilla es `.env.example`. La API lo lee con
  `tsx --env-file-if-exists` y el cliente con `loadEnvConfig` desde
  `Frontend/next.config.ts`.
- **No hay proveedor de correo.** Los enlaces de recuperación de contraseña y de
  verificación de email se escriben en el log del servidor. El flujo está
  completo y probado; falta el transporte. Agregar Resend o SMTP es cambiar
  dos callbacks en `apps/api/src/infrastructure/auth/auth.ts`.
- **El token no se escribe en el log.** Un token de reset es una credencial que
  alcanza para tomar la cuenta: el log se lo muestra a cualquiera que lo lea, y
  un log se lee, se agrega y se guarda mucho tiempo. Por eso el enlace se
  escribe con el token redactado (`token=REDACTED`), y el enlace completo solo
  aparece si `AUTH_LOG_SECRETS=1`, que es una comodidad de desarrollo local,
  no una configuración de producción.
- **No hay rate limiting** (RNF-03, RNF-04). Better Auth no lo trae de base:
  hay que agregarlo antes de exponer la app a internet.
- Sin Server Components, el primer render no trae datos: cada página muestra un
  estado de carga explícito y luego pide a la API. Es el costo aceptado del
  split y el motivo por el que el modo demo (Fase 7) tiene que cubrirlo con un
  esqueleto que no parpadee.
- `NEXT_PUBLIC_API_URL` se hornea en el bundle del cliente al compilar: si
  cambiás el puerto de la API, hay que reiniciar `pnpm dev` (o recompilar).
- La navegación después de entrar, registrarse o salir la hacen los guards de
  sesión, que observan el store de Better Auth. Los formularios no navegan: si
  lo hicieran, podrían llegar al área protegida antes de que el store vea la
  sesión nueva.
- El lint cubre solo `Frontend`; la API y el core se validan con `tsc --noEmit`
  en modo estricto.
- `publicHoistPattern: [next]` en `pnpm-workspace.yaml` existe para que
  `eslint-config-next` encuentre `next/dist/compiled/babel/eslint-parser` desde
  su propio paquete.
- El cambio de email aplica de inmediato cuando la cuenta no tiene el email
  verificado, que es el caso normal acá porque no hay verificación por correo.
- La contraseña de la cuenta demo se **restaura** en cada seed. Es lo que
  garantiza que la demo se pueda entrar, pero significa que el seed pisa una
  contraseña cambiada a mano.

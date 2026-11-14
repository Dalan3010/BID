# Arquitectura

## 1. Vista general

```text
┌─────────────────────┐        HTTP + cookie httpOnly        ┌─────────────────────┐
│   apps/web          │ ───────────────────────────────────▶ │   apps/api          │
│   Next.js 16        │ ◀─────────────────────────────────── │   Hono              │
│   (solo cliente)    │        JSON · text/plain stream      │                     │
└─────────┬───────────┘                                      └──────────┬──────────┘
          │                                                             │
          │ importa tipos puros                                         ├──▶ Postgres 17 (Drizzle)
          ▼                                                             ├──▶ Better Auth
┌─────────────────────┐                                                 └──▶ Proveedor IA
│   packages/core     │  dominio puro: tipos, merge, proyecciones
│   @bid/core         │  sin dependencias de runtime
└─────────────────────┘
```

**Regla dura:** el cliente **nunca** importa de `apps/api` ni toca la base. Solo
comparte `@bid/core`.

## 2. Monorepo

| Paquete | Responsabilidad | Depende de |
|---|---|---|
| `packages/core` | Modelo canónico, merge, proyecciones puras | nada |
| `apps/api` | Casos de uso, persistencia, auth, IA, HTTP | `@bid/core` |
| `apps/web` | UI, cliente HTTP, proyecciones de vista | `@bid/core` |

`pnpm-workspace.yaml` define los paquetes; la raíz solo orquesta scripts.

## 3. Capas de la API

```text
routes/            ← HTTP: lee body, exige sesión, mapea errores
   │
application/       ← casos de uso y puertos (interfaces)
   │  use-cases/
   │  ports/
   │
infrastructure/    ← adaptadores concretos
   │  db/           Drizzle + Postgres
   │  auth/         Better Auth
   │  ai/           coach, extractor, fallback, quota
   │
lib/               ← utilidades de transporte (body, errores, sesión, params)
```

### Regla de dependencia

```text
routes → application → (ports) ← infrastructure
```

- `application` **no** conoce Hono, Drizzle, ni el SDK de IA.
- `application` declara **puertos** (interfaces) que `infrastructure` implementa.
- `container.ts` es el **composition root**: el único lugar que decide qué
  implementación recibe la aplicación.

### Puertos principales

| Puerto | Implementación |
|---|---|
| `IdeaRepository` | `DrizzleIdeaRepository` (prod) / `InMemoryIdeaRepository` (tests) |
| `MessageRepository` | `DrizzleMessageRepository` / `InMemoryMessageRepository` |
| `CoachModel` | `RehearsalCoachModel`, `GoogleCoachModel`, `FallbackCoachModel`, `ProviderCoachModel` |
| `Extractor` | `RehearsalExtractor`, `ProviderExtractor`, `FallbackExtractor` |
| `UsageQuota` | `InMemoryUsageQuota` |
| `DemoBook` | `DrizzleDemoBook` |

## 4. Casos de uso

| Caso de uso | Qué hace |
|---|---|
| `createIdea` | Crea una idea con título |
| `listIdeasWithProgress` | Lista ideas + progreso + agenda |
| `loadIdeaGraph` / `loadIdeaGraphForOwner` | Carga el grafo (el segundo valida dueño) |
| `sendMessage` | Un turno: guarda, pide al coach, guarda respuesta |
| `buildCoachContext` | Agenda + system prompt + request al modelo |
| `extractKnowledge` | Lee conversación, llama al extractor, valida cuota |
| `proposeExtractedNodes` | Convierte extracción en propuestas `inferred` |
| `resolveProposal` | `accept` / `correct` / `discard` |
| `proposeNode` / `confirmNode` / `editNode` | Operaciones de nodo de bajo nivel |
| `resetDemo` | Restaura el libro demo |

## 5. Flujo de una petición: enviar un mensaje

```text
POST /api/ideas/:id/messages
        │
        ▼
routes/messages.ts
  ├── requireUser()            ← cookie → sesión
  ├── readJson(messageSchema)  ← Zod 1..4000
  └── sendMessage(...)
        │
        ▼
application/use-cases/send-message.ts
  ├── ideas.findById + ownerId  ← 404 si no es tuyo
  ├── messages.add(user)        ← PRIMERO se guarda
  ├── ideas.loadGraph
  ├── messages.listRecent(12)
  ├── buildCoachRequest         ← agenda = findGaps()
  └── model.stream(request)
        │
        ▼
infrastructure/ai/*
  ├── FallbackCoachModel
  │     ├── GoogleCoachModel (live)  ← fullStream, propaga errores
  │     └── RehearsalCoachModel      ← guion si falla/vacío
  └── chunks de texto
        │
        ▼
  ├── messages.add(assistant)  ← una sola vez, texto completo
  └── Response text/plain (stream)
```

## 6. Sistema de IA

### 6.1 Selección del proveedor

Archivo: [`apps/api/src/infrastructure/ai/index.ts`](../../apps/api/src/infrastructure/ai/index.ts)

```text
COACH_PROVIDER=rehearsal  → RehearsalCoachModel + RehearsalExtractor
COACH_PROVIDER=live       → FallbackCoachModel(GoogleCoachModel, RehearsalCoachModel)
                            FallbackExtractor(ProviderExtractor, RehearsalExtractor)
```

`rehearsal` es el **default a propósito**: la app tiene que poder demostrarse sin
proveedor (RNF-15/16/17).

El coach y el extractor usan **el mismo proveedor**. Un coach guionado con un
extractor live haría la demo inconsistente.

### 6.2 Rehearsal (guion)

- `RehearsalCoachModel`: respuestas predefinidas, con el mismo `AsyncIterable`
  que cualquier otro modelo.
- `RehearsalExtractor`: devuelve una extracción válida basada en el guion.
- No necesita API key.
- Es lo que hace que la demo **nunca** dependa de la red.

### 6.3 Live (Google Gemini)

- `GoogleCoachModel` usa `streamText` del AI SDK con `@ai-sdk/google`.
- Los mensajes `system` se envían por **`instructions`**, no dentro de
  `messages` (el SDK lo rechaza).
- Lee **`fullStream`**, no `textStream`: `textStream` se traga los errores del
  proveedor y termina vacío.
- Cuando llega una parte `error`, **lanza** la excepción.

### 6.4 Fallback (RF-72)

Archivo: [`apps/api/src/infrastructure/ai/fallback.ts`](../../apps/api/src/infrastructure/ai/fallback.ts)

```text
FallbackCoachModel(primary, fallback)
```

| Situación | Comportamiento |
|---|---|
| El proveedor responde | Se usa su respuesta |
| Falla **antes** del primer token | Responde el guion |
| Falla **a mitad** de la respuesta | Se conserva lo que ya llegó (no mezcla voces) |
| Termina **sin texto** (solo blancos) | Responde el guion |
| Falla el extractor | Extrae el guion |

Cada fallo se reporta con `console.error("[api] provider failed…")`.

> **Por qué importa:** si el proveedor se cae o se agota la cuota durante la
> presentación, el recorrido sigue. La demo nunca se corta.

### 6.5 Qué decide la IA y qué no

| Decisión | Quién |
|---|---|
| Qué dimensión falta | `findGaps` (determinista, sin IA) |
| En qué orden preguntar | `findGaps` (orden canónico) |
| Cómo redactar la pregunta | Modelo |
| Qué estructura extraer | Modelo (propone) |
| Si esa estructura entra al plan | **Usuario** (`accept`/`correct`/`discard`) |

## 7. Autenticación

- **Better Auth** corre dentro de la API, no en el cliente.
- La tabla `users` del dominio **es** el modelo `user` de Better Auth: una sola
  fuente de identidad.
- Cookie `httpOnly`: el navegador la envía, JavaScript no la lee.
- `WEB_ORIGIN` es el único origen confiable (CORS + `trustedOrigins`).
- `AUTH_COOKIE_SAMESITE=none` permite API y web en dominios distintos (requiere
  HTTPS).
- Los links con token (reset, verificación) se escriben en el log **redactados**
  salvo `AUTH_LOG_SECRETS=1`.

## 8. Persistencia

Decisión D7:

- Estado actual: **normalizado** (una fila por nodo) → editar es un `UPDATE`
  condicional y la precedencia se impone atómicamente.
- Historial: **desnormalizado** en `idea_versions.graph` (`jsonb`), solo cuando
  el usuario valida un cambio.

Repositorios:

| Repositorio | Tablas |
|---|---|
| `DrizzleIdeaRepository` | `ideas`, `nodes`, `idea_versions` |
| `DrizzleMessageRepository` | `messages` |
| `DrizzleDemoBook` | reset del libro demo |

## 9. Dominio puro (`@bid/core`)

Sin dependencias de runtime: se ejecuta igual en API, cliente y tests.

| Módulo | Contenido |
|---|---|
| `idea/types.ts` | `Idea`, `IdeaNode`, `IdeaGraph`, `NODE_TYPES`, `NODE_PARENT`, `isFilled` |
| `idea/merge.ts` | Precedencia `edited > confirmed > inferred` |
| `idea/projections/gaps.ts` | `findGaps`, `completionRatio` |
| `idea/projections/tree.ts` | Árbol a partir de `NODE_PARENT` |
| `idea/projections/layout.ts` | Posiciones del grafo |
| `chat/types.ts` | `ChatMessage`, `MessageRole` |

## 10. Frontend

### Estructura

```text
apps/web/src/
├── app/
│   ├── (auth)/            sign-in, sign-up, forgot-password, reset-password
│   ├── (app)/
│   │   ├── dashboard/     libro de ideas + agenda
│   │   ├── ideas/[id]/    workspace del business coach
│   │   └── profile/       cuenta
│   └── page.tsx           landing
├── components/ui/         form-fields, loading
└── lib/                   api, auth-client, dimensions, demo, use-session
```

### Workspace de la idea

| Pieza | Rol |
|---|---|
| `ChatPanel` | Conversación con el coach + disparo de extracción |
| `ProposalPanel` | "Lo que he entendido": explicación + aceptar/ajustar/descartar |
| `PlanView` | "Así va quedando tu plan": vista narrativa |
| `IdeaTree` | Estructura técnica (oculta tras un desplegable) |
| `IdeaCard` | Ficha por dimensiones (legacy, reemplazada por `PlanView`) |

### Estado

No hay librería de estado global. Cada página carga su verdad desde la API y la
recarga con `onChanged()` después de una mutación. Así la UI nunca muestra dos
versiones distintas de la misma idea.

## 11. Decisiones clave

| ID | Decisión | Consecuencia |
|---|---|---|
| D2 | La IA propone, el humano valida | Nada entra al plan sin acción del usuario |
| D3 | `edited > confirmed > inferred` | La extracción nunca pisa lo escrito a mano |
| D6 | Chat y extracción separados | Un fallo de extracción no rompe la conversación |
| D7 | Estado normalizado, historial `jsonb` | Updates atómicos y snapshots inmutables |
| RF-24 | Cuota visible | Se anuncia, no se aplica en silencio |
| RF-25 | Mensaje guardado antes del modelo | Un fallo del proveedor no pierde el turno |
| RF-72 | Fallback al guion | La demo nunca se corta |

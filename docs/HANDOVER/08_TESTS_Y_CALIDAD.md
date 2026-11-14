# Tests y calidad

## 1. Cómo correr los tests

```bash
# Todo
pnpm test

# Solo la API
pnpm --filter @bid/api test

# Solo el dominio
pnpm --filter @bid/core test

# Modo watch (API)
pnpm test:watch

# Typecheck de todo el monorepo
pnpm typecheck
```

## 2. Estado actual

```text
apps/api     Test Files  8 passed | 3 skipped (11)
             Tests       74 passed | 10 skipped (84)
```

Los tests de la API corren **sin Postgres**: usan repositorios in-memory.

## 3. Inventario de tests

### 3.1 Dominio (`packages/core`)

| Archivo | Qué cubre |
|---|---|
| `merge.test.ts` | Precedencia `edited > confirmed > inferred`, transiciones permitidas, edición solo de nodos validados, resolución de conflictos con empate |
| `projections/gaps.test.ts` | `findGaps` en orden canónico, dimensión cerrada al confirmar, propuesta `inferred` mantiene el gap abierto con `hasProposals`, `completionRatio` |
| `projections/tree.test.ts` | Árbol derivado de `NODE_PARENT` |
| `projections/layout.test.ts` | Posiciones del grafo |

### 3.2 Casos de uso (`apps/api/src/application/use-cases`)

| Archivo | Qué cubre |
|---|---|
| `chat.test.ts` | **El corazón del coach.** Guarda el mensaje del usuario antes de llamar al modelo; si el modelo falla, el mensaje sigue guardado; rechaza ideas ajenas; rechaza mensajes vacíos; pasa agenda y mensajes recientes al modelo; la agenda se reduce al confirmar dimensiones; una conversación por idea |
| `extraction.test.ts` | Parseo tolerante del JSON del extractor (incluye fences); descarta extracciones inválidas sin persistir; crea propuestas como `inferred`; registra el `messageId` de origen; **nunca pisa un nodo `edited`**; no propone sobre dimensión `confirmed`; no apila propuestas pendientes; cuota agotada; idea ajena |
| `use-cases.test.ts` | Flujos combinados de creación, propuestas, confirmación y progreso |
| `reset-demo.test.ts` | Reset del libro demo y rechazo a cuentas no demo |

### 3.3 HTTP (`apps/api/src/app.test.ts`)

| Qué cubre |
|---|
| Sin sesión → `401` con JSON |
| Los errores llevan headers CORS (sin ellos el navegador reporta fallo de red) |
| El contrato se mantiene en rutas existentes |

### 3.4 Infraestructura

| Archivo | Qué cubre |
|---|---|
| `ai/fallback.test.ts` | Usa el proveedor si responde; cae al guion si falla antes del primer token; conserva lo que llegó si falla a mitad; cae al guion si termina vacío; reporta el fallo; el extractor cae al guion |
| `ai/google-coach-model.test.ts` | El system prompt va como `instructions`; no queda ningún `system` dentro de `messages`; lanza cuando el proveedor falla (para que el fallback pueda actuar) |
| `auth/auth.test.ts` | Configuración de Better Auth |
| `auth/auth-logging.test.ts` | Redacción de tokens en logs |
| `db/idea-repository.test.ts` | Persistencia y merge en el repositorio |
| `db/demo-book.test.ts` | Libro demo y reset |

### 3.5 E2E (`Frontend/e2e/flow.spec.mjs`)

Recorrido real en navegador. **17 verificaciones**:

1. Guard de sesión
2. Login demo
3. Crear idea
4. Las dos vistas del grafo
5. Chat con streaming
6. Extracción
7. Confirmación de propuesta
8. Persistencia
9. Export
10. Sign-out
11. Empty state
12. …hasta 17

Cómo correrlo:

```bash
# Terminal 1
pnpm dev

# Terminal 2
cd Frontend
node e2e/flow.spec.mjs
```

Playwright **no** es dependencia del proyecto (no se quiere meter una descarga de
navegador en el install de todos). Se instala aparte:

```bash
pnpm add -D playwright@1.64.1 --ignore-workspace-root-check
# o fuera del workspace:
cd /tmp && npm install playwright@1.64.1 --no-save

npx playwright install chromium
```

## 4. Qué garantizan los tests (por requisito)

| Requisito | Test |
|---|---|
| RF-23: aceptar / corregir / descartar | `extraction.test.ts` |
| RF-24: cuota visible, no silenciosa | `extraction.test.ts` |
| RF-25: el mensaje sobrevive al fallo del modelo | `chat.test.ts` |
| RF-33: no se sobrescribe lo editado | `extraction.test.ts`, `merge.test.ts` |
| RF-72: fallback al guion | `fallback.test.ts` |
| D2: la IA propone, el humano valida | `extraction.test.ts`, `use-cases.test.ts` |
| D3: precedencia de procedencia | `merge.test.ts`, `idea-repository.test.ts` |
| D6: chat y extracción separados | `chat.test.ts`, `extraction.test.ts` |

## 5. Qué **no** cubren

Sé honesto con esto al continuar:

| Área | Estado |
|---|---|
| Integración real con Postgres | ❌ No hay tests contra la base real (solo in-memory y un `bid_test` preparado) |
| Migraciones | ❌ No se testea que las migraciones apliquen limpiamente |
| Google Gemini en vivo | ❌ Solo se testea con `MockLanguageModelV4`; el fallback sí está cubierto |
| UI unitaria (componentes) | ❌ No hay tests de componentes React |
| E2E automatizado en CI | ⚠️ Existe el script, pero no está integrado en `pnpm test` |
| Cobertura numérica | ⚠️ No hay reporte de cobertura configurado |
| Concurrencia | ⚠️ No hay tests de carreras sobre el mismo nodo |

## 6. Convenciones al agregar tests

1. **Un test por regla pedida.** No rellenar con casos que nadie pidió.
2. **Probar el efecto observable completo**: salida, código, estado persistido.
3. **Usar la interfaz pública** del módulo, no detalles internos.
4. **Repositorios in-memory** para casos de uso.
5. **Mocks del modelo** (`FixedCoachModel`, `MockLanguageModelV4`) para no
   depender de la red.
6. **Toda regla existente que comparta código** con el cambio debe tener un test
   que pruebe que sigue funcionando.
7. **Estado temporal fuera del worktree** (`mktemp -d`), nunca commiteado.

## 7. Calidad de código

| Herramienta | Comando | Alcance |
|---|---|---|
| TypeScript | `pnpm typecheck` | Todo el monorepo |
| ESLint | `pnpm lint` | Solo `Frontend` |
| Vitest | `pnpm test` | `core` + `api` |

> `apps/api` no tiene ESLint configurado hoy. El typecheck cubre lo esencial.

## 8. Antes de entregar

```bash
pnpm typecheck
pnpm test
pnpm lint
```

Y el E2E si el entorno lo permite.

# Diccionario de datos

Fuente de verdad: [`apps/api/src/infrastructure/db/schema.ts`](../../apps/api/src/infrastructure/db/schema.ts)
(Drizzle ORM) y [`packages/core/src/idea/types.ts`](../../packages/core/src/idea/types.ts)
(dominio puro).

Decisiones de persistencia (D7):

- El **estado actual** de una idea se guarda **normalizado** (una fila por nodo).
- Los **snapshots históricos** se guardan **desnormalizados** en
  `idea_versions.graph` como `jsonb`.
- Editar un nodo es un `UPDATE` condicional; la precedencia del merge
  (`edited > confirmed > inferred`) se puede imponer de forma atómica.

## 1. Diagrama de relaciones

```text
users
 ├── sessions        (1:N, cascade)
 ├── accounts        (1:N, cascade)   ← password hasheado de Better Auth
 ├── verifications   (N:1 lógica por identifier, sin FK)
 └── ideas           (1:N, cascade)
      ├── messages        (1:N, cascade)
      ├── nodes           (1:N, cascade)   ← message_id → messages (SET NULL)
      └── idea_versions   (1:N, cascade, unique idea_id + version)
```

## 2. Enums

### `node_type`

Los diez tipos de dimensión. Se importan de `NODE_TYPES` en `@bid/core`, así la
base **no puede aceptar** un valor que el dominio no conozca.

| Valor | Significado |
|---|---|
| `problem` | Problema / necesidad que se resuelve |
| `segment` | Cliente al que va dirigido |
| `value_proposition` | Propuesta de valor |
| `solution` | Solución concreta |
| `channels` | Canales para llegar al cliente |
| `revenue` | Ingresos |
| `costs` | Costos |
| `competition` | Competencia / alternativas |
| `metrics` | Métricas de validación |
| `risks` | Riesgos |

### `node_source`

Procedencia de un nodo. Es el campo que habilita procedencia, confianza y
resolución de conflictos.

| Valor | Significado | Cuenta como conocimiento |
|---|---|---|
| `inferred` | La IA lo propuso y nadie lo validó | ❌ No |
| `confirmed` | El usuario validó una propuesta de la IA | ✅ Sí |
| `edited` | El usuario lo escribió o reescribió a mano | ✅ Sí |

Precedencia de merge: `edited` > `confirmed` > `inferred`.
Un nodo `edited` **nunca** es sobrescrito por extracción automática.

### `message_role`

| Valor | Significado |
|---|---|
| `user` | Mensaje del usuario |
| `assistant` | Respuesta del coach |
| `system` | Mensaje de sistema (reservado) |

## 3. Tablas

### 3.1 `users`

Propietario de las ideas. Su forma imita el modelo `user` de Better Auth para
reutilizar una sola fuente de identidad.

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `text` | No | — | PK. Better Auth genera strings |
| `name` | `text` | No | — | Nombre visible |
| `email` | `text` | No | — | **UNIQUE** |
| `email_verified` | `boolean` | No | `false` | |
| `image` | `text` | Sí | `null` | Avatar opcional |
| `created_at` | `timestamptz` | No | `now()` | |
| `updated_at` | `timestamptz` | No | `now()` | |

### 3.2 `sessions`

Sesiones de Better Auth.

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `text` | No | — | PK |
| `expires_at` | `timestamptz` | No | — | |
| `token` | `text` | No | — | **UNIQUE** |
| `created_at` | `timestamptz` | No | `now()` | |
| `updated_at` | `timestamptz` | No | `now()` | |
| `ip_address` | `text` | Sí | `null` | |
| `user_agent` | `text` | Sí | `null` | |
| `user_id` | `text` | No | — | FK → `users.id`, `ON DELETE CASCADE` |

Índice: `sessions_user_id_idx (user_id)`.

### 3.3 `accounts`

Cuentas de autenticación (proveedor credencial). Aquí vive el **hash** de la
contraseña, nunca el texto plano.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `text` | No | PK |
| `account_id` | `text` | No | |
| `provider_id` | `text` | No | `credential` para email/password |
| `user_id` | `text` | No | FK → `users.id`, cascade |
| `access_token` | `text` | Sí | |
| `refresh_token` | `text` | Sí | |
| `id_token` | `text` | Sí | |
| `access_token_expires_at` | `timestamptz` | Sí | |
| `refresh_token_expires_at` | `timestamptz` | Sí | |
| `scope` | `text` | Sí | |
| `password` | `text` | Sí | Hash de Better Auth |
| `created_at` | `timestamptz` | No | default `now()` |
| `updated_at` | `timestamptz` | No | default `now()` |

Índice: `accounts_user_id_idx (user_id)`.

### 3.4 `verifications`

Tokens de verificación (reset de contraseña, cambio de email).

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `text` | No | PK |
| `identifier` | `text` | No | Email o identificador |
| `value` | `text` | No | Token |
| `expires_at` | `timestamptz` | No | |
| `created_at` | `timestamptz` | No | default `now()` |
| `updated_at` | `timestamptz` | No | default `now()` |

Índice: `verifications_identifier_idx (identifier)`.

### 3.5 `ideas`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `owner_id` | `text` | No | — | FK → `users.id`, cascade |
| `title` | `text` | No | — | 1–120 caracteres (validado en API) |
| `summary` | `text` | No | `''` | Resumen libre |
| `created_at` | `timestamptz` | No | `now()` | |
| `updated_at` | `timestamptz` | No | `now()` | |

Índice: `ideas_owner_id_idx (owner_id)`.

### 3.6 `messages`

Conversación por idea.

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `idea_id` | `uuid` | No | — | FK → `ideas.id`, cascade |
| `role` | `message_role` | No | — | `user` \| `assistant` \| `system` |
| `content` | `text` | No | — | 1–4000 caracteres en entrada |
| `created_at` | `timestamptz` | No | `now()` | |

Índice: `messages_idea_created_idx (idea_id, created_at)` — el historial se lee
ordenado por ese par.

### 3.7 `nodes`

Conocimiento estructurado de una idea.

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `idea_id` | `uuid` | No | — | FK → `ideas.id`, cascade |
| `type` | `node_type` | No | — | Una de las 10 dimensiones |
| `content` | `text` | No | — | Texto de la dimensión |
| `source` | `node_source` | No | `inferred` | Procedencia |
| `message_id` | `uuid` | Sí | `null` | FK → `messages.id`, `SET NULL` |
| `confidence` | `real` | Sí | `null` | Solo para `inferred` |
| `created_at` | `timestamptz` | No | `now()` | |
| `updated_at` | `timestamptz` | No | `now()` | |

Índices:

- `nodes_idea_type_idx (idea_id, type)`
- `nodes_idea_source_idx (idea_id, source)`

### 3.8 `idea_versions`

Snapshot inmutable del grafo completo. Se escribe **solo cuando el usuario
valida un cambio**, nunca en cada tecla.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `uuid` | No | PK |
| `idea_id` | `uuid` | No | FK → `ideas.id`, cascade |
| `version` | `integer` | No | Consecutivo por idea |
| `graph` | `jsonb` | No | `IdeaGraph` completo |
| `created_at` | `timestamptz` | No | default `now()` |

Índice único: `idea_versions_idea_version_idx (idea_id, version)`.

## 4. Tipos de dominio (`@bid/core`)

### `Idea`

```ts
interface Idea {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly summary: string;
  readonly createdAt: string;  // ISO 8601
  readonly updatedAt: string;  // ISO 8601
}
```

### `IdeaNode`

```ts
interface IdeaNode {
  readonly id: string;
  readonly ideaId: string;
  readonly type: NodeType;      // las 10 dimensiones
  readonly content: string;
  readonly source: NodeSource;  // inferred | confirmed | edited
  readonly messageId: string | null;
  readonly confidence: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

### `IdeaGraph`

```ts
interface IdeaGraph {
  readonly ideaId: string;
  readonly nodes: readonly IdeaNode[];
}
```

### `ChatMessage`

```ts
interface ChatMessage {
  readonly id: string;
  readonly ideaId: string;
  readonly role: MessageRole;   // user | assistant | system
  readonly content: string;
  readonly createdAt: string;
}
```

### `Gap`

```ts
interface Gap {
  readonly type: NodeType;
  readonly hasProposals: boolean;  // hay propuestas sin validar
}
```

### `IdeaProgress` (respuesta del dashboard)

```ts
interface IdeaProgress {
  readonly idea: Idea;
  readonly completion: number;    // 0..1
  readonly gaps: number;
  readonly nodeCount: number;
  readonly agenda: readonly Gap[];
}
```

## 5. Jerarquía del árbol

`NODE_PARENT` en `@bid/core` define el padre de cada dimensión. El árbol **no se
autoriza a mano**: es una proyección de este mapa sobre el grafo.

| Dimensión | Padre |
|---|---|
| `problem` | — (raíz) |
| `segment` | `problem` |
| `competition` | `problem` |
| `value_proposition` | `problem` |
| `solution` | `value_proposition` |
| `channels` | `solution` |
| `revenue` | `solution` |
| `costs` | `solution` |
| `metrics` | `solution` |
| `risks` | — (raíz) |

## 6. Proyecciones puras

Todas viven en `@bid/core` y no tienen dependencias de runtime.

| Proyección | Entrada | Salida |
|---|---|---|
| `findGaps` | `IdeaGraph` | `Gap[]` en orden canónico |
| `completionRatio` | `IdeaGraph` | `number` 0..1 |
| `buildDimensionViews` (web) | `IdeaNode[]` | Vista por dimensión con confirmados y propuestas |
| `buildTree` | `IdeaGraph` | Nodos y aristas del árbol |

> `findGaps` es **determinista**: no llama a ningún modelo. La IA solo se usa
> después para **redactar** la pregunta, nunca para decidir qué falta.

## 7. Migraciones

```text
apps/api/drizzle/0000_high_morlun.sql
apps/api/drizzle/0001_violet_micromacro.sql
```

Configuración: `apps/api/drizzle.config.ts`.

Flujo al cambiar el schema:

```bash
pnpm db:generate   # genera SQL desde schema.ts
pnpm db:migrate    # aplica
```

# Arquitectura y patrón de diseño

Documento de referencia del cimiento del proyecto. Describe **cómo está
organizado** el código y **por qué**, no qué funcionalidades existen.

Complementa a [`especificacion-funcional.md`](./especificacion-funcional.md),
que define el producto.

---

## 1. Principios

| # | Principio | Consecuencia práctica |
|---|---|---|
| P1 | El dominio no conoce la infraestructura | `packages/core` no importa Next, React, base de datos ni proveedor de IA |
| P2 | Una sola fuente de verdad | Las ideas se modelan una vez; cada vista es una proyección |
| P3 | Las proyecciones son funciones puras | Mismo grafo, mismo resultado; sin efectos, sin llamadas de red |
| P4 | La IA propone, nunca escribe | Toda salida del modelo entra como `inferred` y requiere validación |
| P5 | Lo determinístico no usa IA | Detectar huecos es una consulta, no una llamada al modelo |
| P6 | El transporte es reemplazable | La API y el cliente se comunican por HTTP; ninguno importa el código del otro |

---

## 2. Dos aplicaciones y el dominio compartido

El repositorio es un monorepo pnpm con tres paquetes. El cliente y la API son
procesos separados; el dominio es el único código que comparten.

```
        +---------------------+            +---------------------+
        |  apps/web           |   HTTP     |  apps/api           |
        |  Next.js (cliente)  | ---------> |  Hono (servidor)    |
        +----------+----------+            +----------+----------+
                   | importa                          | importa
                   +---------------+------------------+
                                   v
                    +------------------------------+
                    |  packages/core  (dominio)    |
                    +------------------------------+
```

- **`packages/core`** es TypeScript puro, sin dependencias de runtime: modelo
  canónico, regla de merge y proyecciones. No importa nada de `apps/`.
- **`apps/api`** es el único proceso que habla con Postgres y con Better Auth.
  Expone JSON y un stream de texto; no renderiza HTML.
- **`apps/web`** no importa nada de `apps/api` ni toca la base. Habla con la API
  por HTTP y comparte con ella solo tipos y proyecciones puras de `@bid/core`.

La razón de la separación es de despliegue y de límites: el cliente puede
cambiar de forma sin arrastrar la base de datos, y la API se puede probar sin
navegador. Lo que **no** cambia es el dominio: el split movió carpetas y
reescribió el transporte, no las reglas del negocio. Eso es la prueba de que la
arquitectura hexagonal servía.

### Capas dentro de la API

```
        +-----------------------------------------+
        |  routes/         (transporte HTTP)      |
        +-------------------+---------------------+
                            | depende de
        +-------------------v---------------------+
        |  application/    (casos de uso)         |
        +-------------------+---------------------+
                            | depende de
        +-------------------v---------------------+
        |  packages/core   (modelo canónico)      |
        +-----------------------------------------+
                            ^
        +-------------------+---------------------+
        |  infrastructure/ (adaptadores)          |
        +-----------------------------------------+
```

**Regla única:** las flechas de dependencia apuntan siempre hacia el dominio.
`packages/core` no importa nada de las otras capas. `infrastructure` implementa
detalles (Postgres, proveedor de IA, auth) y es la única capa que conoce
tecnología externa.

La razón es testeabilidad y longevidad: el núcleo se puede probar sin base de
datos, sin red y sin modelo, y cambiar de proveedor no toca las reglas del
negocio.

### La sesión cruza el límite como cookie

La API emite una cookie **httpOnly**: el JavaScript del cliente no puede leerla,
pero el navegador la adjunta a cada request que pida credenciales. Por eso el
cliente hace `fetch` con `credentials: "include"` y Better Auth acepta solo el
origen exacto de `WEB_ORIGIN`.

En localhost los puertos 3000 y 3001 son **mismo sitio** (el sitio no incluye el
puerto), así que `SameSite=Lax` alcanza. Con dos dominios distintos hace falta
`SameSite=None; Secure`, que se activa con `AUTH_COOKIE_SAMESITE=none`. Es el
fallo silencioso clásico de este split y por eso está documentado.

---

## 3. Mapa de directorios

```
packages/core/src/
├── idea/
│   ├── types.ts            Modelo canónico: nodos, fuentes, jerarquía
│   ├── merge.ts            Precedencia edited > confirmed > inferred
│   ├── projections/
│   │   ├── gaps.ts         Proyección: huecos y completitud
│   │   ├── tree.ts         Proyección: jerarquía visual
│   │   └── layout.ts       Proyección: posiciones del árbol
│   └── index.ts            Punto de entrada del módulo
├── chat/types.ts           Tipos de la conversación
└── index.ts                API pública de @bid/core

apps/api/
├── drizzle/                Migraciones SQL versionadas
└── src/
    ├── app.ts              App Hono: CORS, middleware de errores, montaje
    ├── index.ts            Arranque del servidor
    ├── routes/             ideas, messages, extractions, proposals, account
    ├── application/
    │   ├── ports/          Interfaces que la infraestructura implementa
    │   ├── use-cases/      Crear idea, proponer nodo, confirmar, editar…
    │   └── testing/        Implementación en memoria del puerto (tests)
    └── infrastructure/
        ├── auth/           Instancia de Better Auth sobre la tabla users
        ├── db/             Esquema, cliente, repositorios, migración y seed
        ├── ai/             Coach y extractor: guion y proveedor
        └── container.ts    Composition root: qué implementación se usa

apps/web/src/
├── app/
│   ├── (auth)/             Rutas públicas: entrar, crear cuenta, recuperar
│   ├── (app)/              Rutas protegidas: dashboard, idea, perfil
│   └── page.tsx            Raíz: redirige a dashboard o a entrar
├── components/ui/          Primitivas de formulario y estados de carga
└── lib/
    ├── api.ts              Cliente HTTP tipado y contrato de transporte
    ├── auth-client.ts      Cliente de Better Auth
    ├── use-session.ts      Guards de sesión
    └── dimensions.ts       Etiquetas y vistas de dimensión
```

La regla de dependencia es de una sola dirección:

```
routes ──▶ application ──▶ packages/core
              ▲
              │ implementa
        infrastructure
```

`packages/core` no importa nada de `application` ni de `infrastructure`.
`application` declara puertos; `infrastructure` los implementa. Eso es lo que
permite testear los casos de uso con un repositorio en memoria, sin base de
datos.

El cliente repite la forma, pero del otro lado del HTTP: `app/` renderiza,
`lib/api.ts` es su único punto de contacto con la API y los tipos de respuesta
del transporte (`IdeaProgress`, `IdeaDetail`, `ExtractionResult`) viven ahí, no
en el dominio. El dominio describe la idea; el transporte describe cómo viaja.

---

## 4. Modelo canónico

Una idea se describe con **diez dimensiones** (`NodeType`). Cada pieza de
conocimiento es un `IdeaNode` que pertenece a una dimensión y declara su
procedencia.

```ts
type NodeSource = "inferred" | "confirmed" | "edited";
```

| Fuente | Significado | ¿Cierra un hueco? |
|---|---|---|
| `inferred` | La IA lo propuso, el usuario no lo validó | No |
| `confirmed` | El usuario validó una propuesta | Sí |
| `edited` | El usuario lo escribió o reescribió | Sí |

**Precedencia de merge:** `edited` > `confirmed` > `inferred`.

Un nodo `inferred` no cierra un hueco porque **es una pregunta, no una
respuesta**. Mientras no haya validación humana, el coach sigue insistiendo.
Eso es lo que evita que la app se llene de datos que el usuario nunca afirmó.

El campo `source` cumple tres funciones a la vez:

1. **Confianza:** se puede mostrar de dónde salió cada afirmación.
2. **Trazabilidad:** `messageId` permite volver al mensaje que la originó.
3. **Conflicto:** la precedencia de merge es una consecuencia directa del campo.

---

## 5. El patrón: proyecciones

> Una metodología no es un esquema de datos. Es una **función** del grafo.

```
                    ┌──────────────┐
                    │   IdeaGraph  │
                    └──────┬───────┘
           ┌───────────────┼───────────────┬──────────────┐
           ▼               ▼               ▼              ▼
      buildTree()     findGaps()     layoutTree()     (canvas…)
        árbol          agenda        posiciones       futuras
```

Una proyección:

- recibe `IdeaGraph` y devuelve datos de presentación;
- no muta la entrada;
- no lee base de datos, red ni reloj;
- se testea con un objeto literal.

Ejemplo real del repositorio:

```ts
export function findGaps(graph: IdeaGraph): Gap[] {
  return NODE_TYPES.flatMap((type) => {
    const nodes = graph.nodes.filter((node) => node.type === type);
    if (nodes.some(isFilled)) {
      return [];
    }
    return [{ type, hasProposals: nodes.length > 0 }];
  });
}
```

**Por qué importa:** agregar una metodología nueva es escribir una función, no
migrar datos. Y como el historial se guarda sobre el grafo, todas las
proyecciones heredan el historial sin trabajo extra.

### Jerarquía como dato, no como código

El árbol no está escrito a mano. Se deriva de `NODE_PARENT`:

```ts
export const NODE_PARENT: Readonly<Record<NodeType, NodeType | null>> = {
  problem: null,
  segment: "problem",
  value_proposition: "problem",
  solution: "value_proposition",
  channels: "solution",
  revenue: "solution",
  // …
};
```

Cambiar la jerarquía cambia la vista para todos los usuarios **sin tocar datos
almacenados**.

### El layout también es una proyección

React Flow no acomoda los nodos: cada uno necesita una posición explícita. La
posición se calcula en el dominio, con `layoutTree`, y no con una librería de
layout.

La razón es que la jerarquía ya es un árbol: un recorrido en profundidad que
numera a los hermanos alcanza. Una librería de layout resolvería un problema que
no existe, agregaría una dependencia pesada y devolvería algo que no se puede
testear.

```ts
export function layoutTree(tree: readonly TreeNode[]): TreeLayout {
  // x = número de hermano, y = profundidad
}
```

El resultado es determinista: el mismo árbol produce siempre el mismo canvas.
Eso es lo que permite testearlo con un objeto literal, como cualquier otra
proyección.

---

## 6. Persistencia

### Por qué no una base de datos de grafos

El grafo de una idea tiene decenas de nodos, no millones de relaciones. Postgres
cubre el caso sin costo operativo extra.

Una base de grafos aquí sería una dependencia, un lenguaje de consulta y un
modelo mental adicionales para resolver un problema que no existe. La regla es
simple: **se paga complejidad cuando el volumen la justifica, no antes.**

### Estado actual relacional, historial en `jsonb` (D7)

El grafo se guarda de dos formas a la vez:

| Qué | Dónde | Por qué |
|---|---|---|
| Estado actual | Tabla `nodes`, una fila por nodo | La regla de merge es por nodo: un `UPDATE` condicionado, no una reescritura del documento |
| Historial | `idea_versions.graph` (`jsonb`) | Un snapshot es inmutable: se lee entero o no se lee |

La tentación era guardar todo el grafo en una columna `jsonb` de `ideas`. Se
descartó porque cada edición de un nodo habría reescrito el documento completo y
dos ediciones concurrentes se habrían pisado, dejando la precedencia
`edited > confirmed > inferred` sin garantía.

Con filas, en cambio, cada nodo tiene su propio `source` y su propio
`updated_at`, y la base puede indexar `(idea_id, type)` para que la detección de
huecos sea barata.

### Tablas

| Tabla | Rol |
|---|---|
| `users` | Identidad y dueño de las ideas. Es también el modelo `user` de Better Auth (D8) |
| `ideas` | Metadatos de la idea |
| `nodes` | Una fila por pieza de conocimiento, con procedencia y confianza |
| `messages` | Origen de cada nodo (`nodes.message_id`), y base del historial de chat |
| `idea_versions` | Snapshot `jsonb` del grafo completo, inmutable |
| `sessions` | Sesiones de Better Auth |
| `accounts` | Cuenta de credenciales: guarda el hash de la contraseña, nunca la contraseña |
| `verifications` | Tokens de un solo uso: recuperación de contraseña y verificación de email |

`node_type`, `node_source` y `message_role` son **enums de Postgres** derivados
del dominio. Un valor que el dominio no conoce es rechazado por la base, no solo
por TypeScript.

### Una sola tabla de identidad (D8)

Better Auth trae su propia tabla `user` por defecto. Acá **no se usa**: la tabla
`users` del dominio es el modelo `user` de la librería
(`user.modelName: "users"`), y el adaptador de Drizzle recibe el esquema con las
claves `user`, `session`, `account` y `verification` apuntando a las tablas del
proyecto.

La razón es que `ideas.owner_id` ya referenciaba `users` desde la Fase 1. Con
dos tablas de identidad habría que sincronizarlas, y todo el código que resuelve
"de quién es esta idea" tendría que preguntar en dos lugares.

Consecuencia práctica: `users.id` es `text`, no `uuid` como el resto de las
tablas, porque es lo que Better Auth genera.

### Migraciones

`drizzle-kit generate` compara el esquema TypeScript contra las migraciones
existentes y escribe un `.sql` nuevo. Esos archivos se versionan en `drizzle/`.
Aplicarlos es responsabilidad de `apps/api/src/infrastructure/db/migrate.ts`, no de
`drizzle-kit`: así el mismo camino corre en desarrollo, en los tests de
integración y en cualquier otro entorno.

---

## 7. La capa de IA

La IA se usa en tres puntos distintos, y **no** son la misma llamada:

| Punto | Qué hace | Determinístico |
|---|---|---|
| Conversar | Responde con streaming | No |
| Extraer | Conversación → nodos propuestos | No |
| Detectar huecos | Qué dimensión falta | **Sí** (`findGaps`) |

La detección de huecos está implementada como función pura precisamente para
demostrar el principio P5: si no necesita un modelo, no lo usa. Cuesta cero,
no falla y es trivial de testear.

### Un puerto, dos implementaciones

La capa de IA se habla con un puerto declarado en `application/ports/`:

```ts
export interface CoachModel {
  stream(input: CoachRequest): AsyncIterable<string>;
}
```

La aplicación pide "la próxima cosa que dice el coach" y recibe un flujo de
texto. **No sabe de dónde sale.** Hay dos implementaciones detrás:

| Implementación | Qué es | Cuándo |
|---|---|---|
| `RehearsalCoachModel` | Responde desde un guion, una pregunta por dimensión abierta | Por defecto |
| `GoogleCoachModel` | Llama al proveedor con el AI SDK | Con `COACH_PROVIDER=live` |

Por qué así:

- **La app funciona sin proveedor y sin red.** Es lo que pide RNF-15 y lo que
  hace segura la demo en vivo.
- **El proveedor es un detalle de infraestructura.** Cuando se elija, es una
  clase más que implementa la misma interfaz. `application/` y `app/` no
  cambian.
- **El guion no es un mock vacío.** Las preguntas son las que el dominio
  decidió que faltan, y las respuestas son las que daría un coach. La demo
  muestra el producto real, con una fuente de verdad determinista.

La agenda —qué dimensión preguntar— la decide `findGaps`, no el modelo. El
modelo solo redacta la pregunta (D6).

### El extractor: otro puerto, otra llamada

Extraer es un trabajo distinto de conversar, así que tiene su propio puerto:

```ts
export interface Extractor {
  extract(input: ExtractionRequest): Promise<string>;
}
```

Devuelve **texto**, no un objeto: el contrato del puerto es "esto dijo el
modelo". La validación vive en el borde
(`infrastructure/ai/extraction-schema.ts`) y usa **Zod**: lo que no valida se
descarta entero, nunca se aplica a medias.

| Implementación | Qué hace | Cuándo |
|---|---|---|
| `RehearsalExtractor` | Busca patrones verificables en lo que dijo el usuario | Por defecto |
| `ProviderExtractor` | Le pide JSON estricto al proveedor | Con `COACH_PROVIDER=live` |

El extractor **no sabe** qué puede sobrescribir: devuelve propuestas con su
dimensión, su texto y su confianza. La precedencia `edited > confirmed >
inferred` la aplica el caso de uso, porque es una regla del dominio (D3).

La cuota de llamadas vive detrás de un puerto (`UsageQuota`) con una
implementación en memoria por proceso. Cuenta llamadas, no mensajes, y se
consulta **antes** de llamar al modelo: el usuario se entera del límite en vez
de ver que no pasa nada (RF-24).

---

## 8. Estado actual

Implementado:

- Monorepo pnpm con `packages/core`, `apps/api` y `apps/web`.
- Scaffold de Next.js 16 + TypeScript + Tailwind 4 en `apps/web`.
- Modelo canónico (`packages/core/src/idea/types.ts`).
- Proyecciones puras: `findGaps`, `completionRatio`, `buildTree`, `layoutTree`.
- Regla de merge `edited > confirmed > inferred` como funciones puras
  (`packages/core/src/idea/merge.ts`).
- Esquema Postgres con ocho tablas y migraciones versionadas.
- Puerto `IdeaRepository` e implementación con Drizzle.
- Casos de uso: crear idea, cargar grafo, cargar grafo por dueño, listar ideas
  con progreso, proponer nodo, confirmar nodo, editar nodo, obtener agenda del
  coach.
- Autenticación con Better Auth sobre la tabla `users` (D8): registro, login,
  logout, cambio y recuperación de contraseña, cambio de email, borrado de
  cuenta.
- API Hono con CORS por origen exacto, cookie httpOnly y rutas de ideas,
  mensajes, extracciones, propuestas y cuenta.
- Cliente HTTP tipado (`apps/web/src/lib/api.ts`) con `credentials: "include"`.
- Rutas: entrar, crear cuenta, recuperar contraseña, dashboard y perfil.
- Aislamiento por dueño: una idea ajena devuelve `IdeaNotFoundError`, no
  "prohibido".
- Exportación de datos en JSON con el grafo y el historial de versiones.
- Seed de la idea demo: diez dimensiones confirmadas, cero huecos, y la cuenta
  `demo@bid.local`.
- Vista árbol con React Flow, derivada de `buildTree` + `layoutTree`.
- Vista card con el estado de las diez dimensiones.
- Chat con streaming e historial por idea.
- Capa de IA detrás del puerto `CoachModel`, con una implementación de guion y
  otra de proveedor.
- Extracción de la conversación a nodos detrás del puerto `Extractor`, con
  salida validada por Zod, en una ruta aparte del chat.
- Panel de propuestas: confirmar, corregir o descartar. Nada pasa a
  `confirmed` sin una acción del usuario.
- Precedencia aplicada en el caso de uso: un nodo `edited` nunca se sobrescribe
  y una propuesta pendiente no se apila con otra de la misma dimensión.
- Cuota de extracciones con aviso explícito antes de cortar.
- 84 tests: proyecciones, regla de merge, layout del árbol, casos de uso con
  repositorio en memoria, repositorio real contra Postgres, esquema de
  autenticación, turnos de conversación y extracción.

Deliberadamente **no** implementado todavía:

- Historial y diff entre versiones (Fase 6).
- Proveedor de modelo configurado: la app responde desde el guion.
- Rate limiting (RNF-03, RNF-04).
- Proveedor de correo: los enlaces se escriben en el log del servidor.

El orden de construcción está definido en `docs/roadmap.md`: primero lo visible
con datos fijos, la IA al final.

---

## 9. Convenciones

- **TypeScript estricto** (`strict: true`). Sin `any` en el dominio.
- **Dominio puro:** si un archivo en `packages/core` importa algo externo, es un
  error de arquitectura.
- **El cliente no importa la API:** si `apps/web` importa algo de `apps/api`, es
  un error de arquitectura. Lo compartido vive en `@bid/core`.
- **Comentarios en inglés**, identificadores en inglés, documentación en
  español.
- **Commits convencionales** (`feat:`, `fix:`, `docs:`, `chore:`), sin
  atribución a herramientas.
- **Tests junto al código** (`*.test.ts`), no en un árbol paralelo.

# Validaciones y reglas de negocio

Dos capas distintas, a propósito:

1. **Validación de transporte** (borde HTTP): ¿el cuerpo tiene la forma correcta?
   → `400 Cuerpo inválido.`
2. **Reglas de dominio**: ¿esta operación tiene sentido para esta idea y este
   usuario? → errores tipados mapeados a `403/404/409`.

> Principio del producto (D2): **la IA propone, el humano valida.** Nada entra al
> plan sin `accept`, `correct` o `discard`.

## 1. Validación de entrada (Zod)

Archivo: [`apps/api/src/lib/body.ts`](../../apps/api/src/lib/body.ts)

| Endpoint | Schema | Reglas |
|---|---|---|
| `POST /api/ideas` | `createIdeaSchema` | `title`: string, `trim()`, mínimo 1, máximo **120** |
| `POST /api/ideas/:id/messages` | `messageSchema` | `content`: string, `trim()`, mínimo 1, máximo **4000** |
| `POST /api/ideas/:id/proposals/:nodeId` | `proposalSchema` | `decision`: `accept` \| `correct` \| `discard`; `content`: string opcional, `trim()`, máximo **2000** |

Comportamiento de `readJson`:

- JSON malformado → `400 Cuerpo inválido.`
- Schema inválido → `400 Cuerpo inválido.`
- En ambos casos el cliente no puede hacer nada distinto, así que comparten
  respuesta.

## 2. Validación de la extracción (frontera del modelo)

Archivo: [`apps/api/src/infrastructure/ai/extraction-schema.ts`](../../apps/api/src/infrastructure/ai/extraction-schema.ts)

Lo que devuelve el modelo **no entra al dominio sin pasar por este schema**.

```ts
extractedNodeSchema = {
  type: enum(NODE_TYPES),          // solo las 10 dimensiones válidas
  content: string min(1) max(600),
  confidence?: number 0..1,
}

extractionSchema = {
  nodes: array(extractedNodeSchema).max(6),   // techo de 6 propuestas
}
```

Reglas:

| Situación | Resultado |
|---|---|
| JSON válido | Se usa |
| JSON envuelto en texto o ```json fences | Se intenta extraer el primer `{…}` |
| JSON inválido / no JSON | Se descarta entero, **no se persiste nada** |
| `content` vacío | Se descarta |
| `confidence` fuera de 0..1 | Se descarta |
| `type` desconocido | Se descarta |
| Más de 6 nodos | Se descarta |

> Un fallo del extractor **nunca** rompe la conversación ni modifica el grafo.

## 3. Reglas de negocio por caso de uso

### 3.1 Enviar mensaje (`sendMessage`)

Archivo: [`send-message.ts`](../../apps/api/src/application/use-cases/send-message.ts)

| Regla | Resultado |
|---|---|
| `content.trim()` vacío | Error de dominio |
| La idea no existe | `IdeaNotFoundError` → **404** |
| La idea es de otro usuario | `IdeaNotFoundError` → **404** (nunca 403: no se confirma que exista) |
| Sesión ausente | `401 No hay sesión.` |

**Orden garantizado:**

1. Se guarda el mensaje del usuario **antes** de llamar al modelo.
2. Se carga el grafo.
3. Se calcula la agenda con `findGaps` (determinista, sin IA).
4. Se llama al modelo.
5. Se guarda la respuesta completa del coach **una sola vez** (no por chunk).

Si el modelo falla, el mensaje del usuario **sigue guardado** y puede reintentar
(RF-25).

### 3.2 Extracción (`extractKnowledge`)

Archivo: [`extract-knowledge.ts`](../../apps/api/src/application/use-cases/extract-knowledge.ts)

| Regla | Resultado |
|---|---|
| La idea no existe / es ajena | `404` |
| Cuota agotada | `{ quotaReached: true, proposals: [] }` → **429** |
| No hay ningún mensaje de usuario | No llama al extractor, devuelve vacío |
| El extractor devuelve basura | Descarta, no persiste |
| Extracción válida | Crea propuestas `inferred` |

Cuota:

- Se cuenta **en memoria por proceso**, por `userId`.
- Límite: `COACH_QUOTA` (default **50**).
- Se consume **una vez por extracción exitosa** (después de llamar al extractor).
- Al agotarse, el mensaje se anuncia explícitamente; no se aplica en silencio.

### 3.3 Crear propuestas (`proposeExtractedNodes`)

Archivo: [`propose-extracted-nodes.ts`](../../apps/api/src/application/use-cases/propose-extracted-nodes.ts)

Por cada nodo extraído, se decide si entra o se salta:

| Condición de la dimensión | Acción | Razón registrada |
|---|---|---|
| Ya tiene un nodo `edited` | **Se salta** | `already_edited` |
| Ya tiene un nodo `confirmed` | **Se salta** | `already_answered` |
| Ya tiene una propuesta `inferred` pendiente | **Se salta** | `pending_proposal` |
| El contenido queda vacío tras `trim()` | **Se salta** | `nothing_extracted` |
| Ninguna de las anteriores | **Se crea** como `inferred` | — |

Reglas duras:

- La extracción **nunca** crea nodos `confirmed`.
- La extracción **nunca** sobrescribe un nodo `edited` (D3, RF-33).
- No se apilan dos propuestas para la misma dimensión: sería ruido.
- El nodo creado guarda `messageId` del **último mensaje del usuario**.
- `confidence` es la del modelo y es `null` si no vino.

### 3.4 Resolver propuesta (`resolveProposal`)

Archivo: [`resolve-proposal.ts`](../../apps/api/src/application/use-cases/resolve-proposal.ts)

| Decisión | Efecto en el nodo | `source` resultante | `confidence` |
|---|---|---|---|
| `accept` | Se confirma | `confirmed` | se pone en `null` |
| `correct` | Se reescribe con `content` | `edited` | se pone en `null` |
| `discard` | Se elimina | — | — |

Validaciones:

| Caso | Resultado |
|---|---|
| El nodo no existe en esa idea | `NodeNotFoundError` → **404** |
| `correct` con `content` vacío | `NodeNotEditableError` → **409** |
| La idea no es del usuario | `404` (se comprueba antes de escribir) |

> La confianza del modelo **no** se conserva al confirmar: describe una
> suposición de la IA, no la certeza del usuario.

### 3.5 Reset de demo (`resetDemo`)

| Regla | Resultado |
|---|---|
| La cuenta no es la demo | `NotDemoAccountError` → **403** |
| Sesión ausente | `401` |

El reset borra ideas: una cuenta real **nunca** debe alcanzarlo, ni llamando al
endpoint a mano.

## 4. Reglas de procedencia (merge)

Archivo: [`packages/core/src/idea/merge.ts`](../../packages/core/src/idea/merge.ts)

```text
edited  (2)  >  confirmed  (1)  >  inferred  (0)
```

| Función | Regla |
|---|---|
| `outranks(incoming, existing)` | Solo gana si es **estrictamente** mayor |
| `canTransition(existing, incoming)` | Igual rango permitido (reconfirmar no degrada) |
| `isEditable(source)` | Solo `confirmed` y `edited` se editan a mano |
| `resolveConflict(existing, incoming)` | En empate gana el existente |

Consecuencias prácticas:

- Un nodo `inferred` **no** se puede editar directamente: primero se confirma.
  Editar en silencio convertiría una suposición de la IA en palabras del
  usuario, que es exactamente el bug de procedencia que este modelo evita.
- Un nodo `edited` jamás es sobrescrito por extracción automática.

## 5. Qué cuenta como "conocimiento"

Archivo: [`packages/core/src/idea/types.ts`](../../packages/core/src/idea/types.ts)

```ts
function isFilled(node) {
  return node.source === "confirmed" || node.source === "edited";
}
```

- `inferred` **no** cierra una dimensión. Es una pregunta, no una respuesta.
- Por eso `findGaps` puede devolver `{ type, hasProposals: true }`: la dimensión
  sigue abierta aunque haya una propuesta esperando.

## 6. Validaciones de autenticación

Archivo: [`apps/api/src/infrastructure/auth/auth.ts`](../../apps/api/src/infrastructure/auth/auth.ts)

| Regla | Detalle |
|---|---|
| Cookie de sesión | `httpOnly`, emitida por la API |
| `WEB_ORIGIN` | Único origen de confianza para CORS y Better Auth |
| `AUTH_COOKIE_SAMESITE=none` | Obliga a `Secure` (requiere HTTPS) |
| Tokens de reset | **Nunca** se loguean por defecto; se redactan como `REDACTED` |
| `AUTH_LOG_SECRETS=1` | Solo desarrollo: permite leer el link del log |
| Contraseña | Siempre hasheada por Better Auth, nunca en texto plano |

## 7. Validaciones del cliente (UX)

| Regla | Dónde |
|---|---|
| El botón Enviar se deshabilita con input vacío o mientras hay una petición | `chat-panel.tsx` |
| El textarea se deshabilita mientras se espera respuesta | `chat-panel.tsx` |
| El mensaje del usuario aparece de inmediato (optimista) y se reconcilia al volver el servidor | `chat-panel.tsx` |
| Si falla la red, se avisa y se recarga el estado real | `chat-panel.tsx` |
| Si la cuota se agota, se muestra aviso sin bloquear la conversación | `chat-panel.tsx` |
| Si la extracción falla, se avisa sin tocar los nodos | `chat-panel.tsx` |
| El plan solo muestra nodos `confirmed`/`edited` | `plan-view.tsx` |

## 8. Resumen de códigos de error

| Código | Cuándo | Mensaje |
|---|---|---|
| `400` | Cuerpo malformado o inválido | `Cuerpo inválido.` |
| `401` | Sin sesión | `No hay sesión.` |
| `403` | Reset desde cuenta no demo | `Solo la cuenta demo se puede reiniciar.` |
| `404` | Idea o nodo inexistente / ajeno | `No encontramos eso.` |
| `409` | Transición de procedencia inválida, corrección vacía | mensaje del error |
| `429` | Cuota de extracciones agotada | mensaje explícito de cuota |
| `500` | Error no controlado | `Algo salió mal.` |
| `502` | Fallo del proveedor de IA | `No pudimos responder en este momento…` |

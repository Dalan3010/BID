# Contratos de API

Base URL local: `http://localhost:3001`

Todas las rutas de negocio viven bajo `/api`. La API es la **única** que habla
con Postgres y Better Auth; el cliente nunca toca la base.

## 1. Convenciones generales

### Autenticación

- La sesión vive en una **cookie httpOnly** emitida por la API.
- El navegador la adjunta automáticamente (`credentials: "include"`).
- El cliente **nunca** envía un `userId`: el propietario se resuelve siempre
  desde la sesión.
- Sin sesión → `401 { "error": "No hay sesión." }`.

### CORS

- Origen permitido: exactamente `WEB_ORIGIN` (nunca `*`, porque las credenciales
  no lo permiten).
- Métodos: `GET, POST, OPTIONS`.
- Headers: `content-type`.
- Preflight cacheado 600 s.

### Formato de error

Todos los errores responden JSON:

```json
{ "error": "Mensaje legible para el usuario." }
```

| Código | Significado |
|---|---|
| `400` | Cuerpo inválido |
| `401` | Sin sesión |
| `403` | Operación reservada a la cuenta demo |
| `404` | Idea o nodo inexistente (o de otro usuario) |
| `409` | Transición de procedencia inválida |
| `429` | Cuota de extracciones agotada |
| `500` | Error no controlado |
| `502` | Fallo del proveedor de IA |

> Los errores también llevan headers CORS. Sin ellos el navegador reportaría un
> fallo de red y el status real nunca llegaría al cliente.

---

## 2. Health

### `GET /api/health`

Sin autenticación.

**200**

```json
{ "ok": true }
```

---

## 3. Autenticación — `/api/auth/*`

Better Auth maneja todo su subárbol. El cliente lo consume con
`createAuthClient({ baseURL: NEXT_PUBLIC_API_URL })`.

Rutas usadas por la app:

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/auth/sign-up/email` | Registro con email y contraseña |
| `POST` | `/api/auth/sign-in/email` | Login |
| `POST` | `/api/auth/sign-out` | Cierra sesión |
| `GET` | `/api/auth/get-session` | Sesión actual |
| `POST` | `/api/auth/request-password-reset` | Solicita reset (link al log) |
| `POST` | `/api/auth/reset-password` | Cambia la contraseña con token |
| `POST` | `/api/auth/update-user` | Actualiza el nombre |
| `POST` | `/api/auth/change-email` | Cambia email |
| `POST` | `/api/auth/change-password` | Cambia contraseña (requiere la actual) |
| `POST` | `/api/auth/delete-user` | Elimina la cuenta (requiere contraseña) |

Configuración relevante:

| Ajuste | Valor |
|---|---|
| `baseURL` | `BETTER_AUTH_URL` (`http://localhost:3001`) |
| `trustedOrigins` | `[WEB_ORIGIN]` |
| Cookie | `httpOnly`; `SameSite=Lax` por defecto, `None+Secure` si `AUTH_COOKIE_SAMESITE=none` |
| Sesión | expira en **7 días**, se renueva cada **1 día** |
| Reset | link `WEB_ORIGIN/reset-password?token=…` escrito en el log |
| Verificación de email | no hay proveedor de correo: se loguea el link |
| Cambio de email | se aplica sin verificación (`updateEmailWithoutVerification: true`) |

> Los tokens de reset **no** se loguean por defecto: aparecen como `REDACTED`.
> Para desarrollo local: `AUTH_LOG_SECRETS=1`.

---

## 4. Ideas — `/api/ideas`

Todas requieren sesión.

### `GET /api/ideas`

Lista las ideas del usuario con su progreso. Es lo que alimenta el dashboard.

**200**

```json
{
  "ideas": [
    {
      "idea": {
        "id": "uuid",
        "ownerId": "user-id",
        "title": "Café de especialidad por suscripción",
        "summary": "Suscripción semanal…",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      "completion": 0.7,
      "gaps": 3,
      "nodeCount": 9,
      "agenda": [
        { "type": "costs", "hasProposals": false },
        { "type": "metrics", "hasProposals": true },
        { "type": "risks", "hasProposals": false }
      ]
    }
  ]
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `completion` | `number` | 0..1, dimensiones validadas / 10 |
| `gaps` | `number` | Dimensiones abiertas |
| `nodeCount` | `number` | Nodos totales (incluye `inferred`) |
| `agenda` | `Gap[]` | Orden canónico del coach |

### `POST /api/ideas`

Crea una idea.

**Body**

```json
{ "title": "Mi idea de negocio" }
```

| Campo | Regla |
|---|---|
| `title` | string, `trim`, 1..120 |

**201**

```json
{
  "idea": {
    "id": "uuid",
    "ownerId": "user-id",
    "title": "Mi idea de negocio",
    "summary": "",
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

**400** si el body no cumple.

### `GET /api/ideas/:id`

Todo lo que la página de la idea necesita, en **una sola vuelta**.

**200**

```json
{
  "idea": { "id": "…", "title": "…", "summary": "…" },
  "graph": {
    "ideaId": "uuid",
    "nodes": [
      {
        "id": "uuid",
        "ideaId": "uuid",
        "type": "problem",
        "content": "…",
        "source": "confirmed",
        "messageId": "uuid|null",
        "confidence": null,
        "createdAt": "…",
        "updatedAt": "…"
      }
    ]
  },
  "messages": [
    {
      "id": "uuid",
      "ideaId": "uuid",
      "role": "user",
      "content": "…",
      "createdAt": "…"
    }
  ],
  "proposals": []
}
```

| Campo | Notas |
|---|---|
| `graph` | Todos los nodos (confirmados, editados e inferidos) |
| `messages` | Historial completo, del más viejo al más nuevo |
| `proposals` | Atajo: `graph.nodes.filter(n => n.source === "inferred")` |

**404** si la idea no existe **o es de otro usuario**. Nunca `403`: un `403`
confirmaría que existe.

### `POST /api/ideas/:id/messages`

Un turno de la conversación.

**Body**

```json
{ "content": "Vendo café a oficinas" }
```

| Campo | Regla |
|---|---|
| `content` | string, `trim`, 1..4000 |

**200** — `text/plain; charset=utf-8`, **streaming**

Headers:

```text
content-type: text/plain; charset=utf-8
cache-control: no-store
x-accel-buffering: no
```

El body es la respuesta del coach en texto plano, por chunks. El cliente la lee
con `response.body.getReader()`.

**Comportamiento**

1. El mensaje del usuario se guarda **antes** de llamar al modelo.
2. Se responde en streaming.
3. La respuesta completa se guarda **una vez** al terminar.
4. Si el proveedor falla: `502` con mensaje claro; el mensaje del usuario sigue
   guardado.

**400 / 401 / 404 / 502**

### `POST /api/ideas/:id/extractions`

Analiza la conversación y propone estructura. Es una llamada **separada** del
chat (D6).

**Body**: `{}`

**200**

```json
{
  "quotaReached": false,
  "proposals": [
    {
      "id": "uuid",
      "type": "revenue",
      "content": "Suscripción mensual de 30",
      "confidence": 0.8
    }
  ]
}
```

**429** — cuota agotada

```json
{
  "quotaReached": true,
  "proposals": [],
  "message": "Llegaste al límite de extracciones disponibles. Podés seguir conversando normalmente."
}
```

**Comportamiento**

- No hay mensajes de usuario → no llama al modelo, devuelve vacío.
- Extracción inválida → no persiste nada, devuelve vacío.
- El extractor falla → `502`, el grafo queda intacto.

### `POST /api/ideas/:id/proposals/:nodeId`

El usuario resuelve una propuesta. **Único camino** que convierte una propuesta
en conocimiento.

**Body**

```json
{ "decision": "accept" }
```

```json
{ "decision": "correct", "content": "Texto corregido por el usuario" }
```

```json
{ "decision": "discard" }
```

| Campo | Regla |
|---|---|
| `decision` | `accept` \| `correct` \| `discard` |
| `content` | opcional; `trim`; máx 2000; requerido para `correct` |

**200**

```json
{ "source": "confirmed", "node": { "id": "uuid", "source": "confirmed", "…": "…" } }
```

| Decisión | `source` | `node` |
|---|---|---|
| `accept` | `confirmed` | nodo actualizado |
| `correct` | `edited` | nodo actualizado |
| `discard` | `null` | `null` |

**400 / 401 / 404 / 409**

---

## 5. Cuenta — `/api/account`

### `GET /api/account/export`

Exporta todos los datos del usuario en JSON (no CSV: una idea es un grafo y una
tabla plana perdería procedencia e historial).

**200** — descarga con:

```text
content-type: application/json; charset=utf-8
content-disposition: attachment; filename="bid-export-YYYY-MM-DD.json"
```

```json
{
  "exportedAt": "2026-11-04T00:00:00.000Z",
  "user": { "id": "…", "name": "…", "email": "…", "emailVerified": false },
  "ideas": [
    {
      "id": "uuid",
      "title": "…",
      "summary": "…",
      "createdAt": "…",
      "updatedAt": "…",
      "graph": { "ideaId": "uuid", "nodes": [] },
      "versions": []
    }
  ]
}
```

**401** sin sesión.

---

## 6. Demo — `/api/demo`

### `POST /api/demo/reset`

Restaura el libro demo (RF-73). Permite repetir el recorrido desde el estado
sembrado.

**204** — sin body.

**401** sin sesión.
**403** si la cuenta no es la demo.

---

## 7. Cliente HTTP (`Frontend/src/lib/api.ts`)

El cliente comparte **solo** los tipos de `@bid/core`; nunca importa de
`apps/api`.

| Función | Endpoint |
|---|---|
| `listIdeas()` | `GET /api/ideas` |
| `createIdea(title)` | `POST /api/ideas` |
| `loadIdea(id)` | `GET /api/ideas/:id` |
| `sendMessage(id, content)` | `POST /api/ideas/:id/messages` (devuelve `Response` crudo para leer el stream) |
| `requestExtraction(id)` | `POST /api/ideas/:id/extractions` |
| `resolveProposal(id, nodeId, decision, content?)` | `POST /api/ideas/:id/proposals/:nodeId` |
| `resetDemo()` | `POST /api/demo/reset` |
| `exportUrl()` | URL de descarga (navegación top-level para que el navegador la trate como descarga) |

Todas usan `credentials: "include"`.

### Manejo de errores en el cliente

```ts
class ApiError extends Error {
  readonly status: number;
}
```

Si la respuesta no es `ok`, se lee `{ error }` y se muestra el mensaje real de la
API. Si no hay JSON, cae a `"Algo salió mal."`.

---

## 8. Ejemplos con curl

```bash
# Login (guarda la cookie)
curl -c cookies.txt -X POST http://localhost:3001/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"demo@bid.local","password":"demo1234"}'

# Listar ideas
curl -b cookies.txt http://localhost:3001/api/ideas

# Crear idea
curl -b cookies.txt -X POST http://localhost:3001/api/ideas \
  -H 'content-type: application/json' \
  -d '{"title":"Mi idea"}'

# Enviar mensaje (streaming)
curl -b cookies.txt -N -X POST http://localhost:3001/api/ideas/<id>/messages \
  -H 'content-type: application/json' \
  -d '{"content":"Quiero vender café a oficinas"}'

# Extraer propuestas
curl -b cookies.txt -X POST http://localhost:3001/api/ideas/<id>/extractions \
  -H 'content-type: application/json' -d '{}'

# Aceptar una propuesta
curl -b cookies.txt -X POST http://localhost:3001/api/ideas/<id>/proposals/<nodeId> \
  -H 'content-type: application/json' \
  -d '{"decision":"accept"}'
```

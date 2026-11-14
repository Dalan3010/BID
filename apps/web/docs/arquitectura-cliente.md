# Arquitectura del cliente

Cómo está construido `apps/web`, cómo habla con la API y qué límites del
backend condicionan la interfaz.

La fuente de verdad de los contratos es
[`docs/HANDOVER/04_CONTRATOS_API.md`](../../../docs/HANDOVER/04_CONTRATOS_API.md)
y el código de `apps/api/src/routes/`. Este cliente **no cambia** ningún
contrato.

---

## 1. Capas

```
app/          Rutas de Next.js. Delgadas: metadata + un componente de vista.
  │
components/   Vistas y piezas de UI. Estado de pantalla y animación.
  │
lib/          Lógica sin JSX: HTTP, stream, sesión, proyecciones de vista.
  │
@bid/core     Tipos del dominio y proyecciones puras (compartido con la API).
```

- Las páginas son Server Components mínimos que montan una vista de cliente.
  Todos los datos son por usuario y viven detrás de una cookie httpOnly de
  **otro origen** (la API), así que se cargan en el navegador con
  `credentials: "include"`.
- `lib/api.ts` es el **único** módulo que hace `fetch` a la API de negocio.
- Las reglas del dominio no se reescriben en React: el progreso se calcula con
  `completionRatio` de `@bid/core` (la misma proyección que usa la API para el
  dashboard) y lo que cuenta como conocimiento sale de `isFilled`.

## 2. Sesión y autenticación

| Pieza | Archivo | Detalle |
|---|---|---|
| Cliente Better Auth | `lib/auth-client.ts` | `createAuthClient({ baseURL: NEXT_PUBLIC_API_URL, fetchOptions: { credentials: "include" } })` |
| Guard del estudio | `lib/session.ts` → `useRequireSession` | Sin sesión → `/sign-in?next=<ruta>` |
| Guard de las pantallas de acceso | `useRedirectIfSignedIn` | Con sesión → `next` o `/dashboard` |
| `next` seguro | `safeNextPath` | Solo rutas internas (`/…`, nunca `//…` ni URLs absolutas) |
| Cuenta demo | `components/auth/demo-sign-in-button.tsx` | `signIn.email` con las credenciales públicas sembradas; mismo mecanismo que cualquier cuenta |

El cliente **nunca** lee ni guarda tokens y **nunca** envía `ownerId`. Cualquier
`401` de la API redirige a `/sign-in`.

## 3. Integración endpoint por endpoint

| Endpoint | Dónde | Comportamiento en la UI |
|---|---|---|
| `GET /api/ideas` | `StudioView` | Lista editorial con `completion`, `gaps`, `agenda` (siguiente dimensión y propuestas por revisar) y fecha. Skeleton al cargar; error con "Reintentar"; estado vacío sin datos inventados. |
| `POST /api/ideas` | `NewIdeaDialog` | Título 1..120 (validado también en el cliente). Se navega a `/ideas/:id` **solo** tras el `201`. |
| `GET /api/ideas/:id` | `useWorkspace.refresh` | Carga idea, grafo, mensajes. `404` → "No encontramos esa idea" (nunca se distingue "ajena" de "inexistente"). Se vuelve a pedir tras cada turno y tras cada extracción con propuestas: el estado local se **reemplaza** por el del servidor. |
| `POST /api/ideas/:id/messages` | `useWorkspace.send` | Mensaje optimista → `fetch` → si `!ok` se lee `{ error }` **antes** de tocar el body → si `ok`, `response.body.getReader()` muestra el texto progresivamente (`lib/stream.ts`, decodificación UTF-8 en streaming). |
| `POST /api/ideas/:id/extractions` | `useWorkspace.extract` | Body `{}`. Se llama **después** de que el coach terminó (D6). `429` → aviso de cuota, la conversación sigue. `502`/otros → aviso suave; ni mensajes ni grafo cambian. Con propuestas → recarga desde el servidor y entrada animada. |
| `POST /api/ideas/:id/proposals/:nodeId` | `useWorkspace.decide` | `accept` / `correct` (con `content`, máx. 2000) / `discard`. El grafo local cambia **solo** con el `node` que devolvió la API (`lib/graph.ts → applyResolution`). `404` → recarga; otros errores, en la propia tarjeta. |
| `GET /api/account/export` | `AccountView` | Enlace con navegación de nivel superior: el navegador adjunta la cookie y trata el `content-disposition` como descarga. |
| `POST /api/demo/reset` | `AccountView` | Sección visible solo para `demo@bid.local`; si aun así llega un `403`, se muestra "Solo la cuenta demo se puede reiniciar." |
| `/api/auth/*` | formularios de `components/auth` y `AccountView` | `sign-up/email`, `sign-in/email`, `sign-out`, `get-session`, `request-password-reset`, `reset-password`, `update-user`, `change-email`, `change-password`, `delete-user`. Errores traducidos por código (`authErrorMessage`); el login nunca revela si el correo existe. |

### El ciclo de un turno (`components/workspace/use-workspace.ts`)

```
idle ──send──▶ sending ──(200)──▶ streaming ──fin──▶ refresh ──▶ extracting ──▶ idle
                  │                    │                              │
                  │ error HTTP         │ corte de red                 ├─ 429 → aviso de cuota
                  ▼                    ▼                              ├─ error → aviso suave
          aviso + refresh       aviso + refresh                       └─ propuestas → refresh
```

- **502 al enviar:** la API ya guardó el mensaje (RF-25). Se avisa, se recarga
  el estado real y el compositor **no** devuelve el texto (evita duplicarlo).
- **Otros errores al enviar** (400, red): el mensaje no se guardó; el texto
  vuelve al compositor.
- El compositor se bloquea mientras el coach responde; durante la extracción se
  puede ir escribiendo, pero no enviar.

### Otras piezas del workspace

| Pieza | Datos que usa | Detalle |
|---|---|---|
| Trazabilidad (RF-52) | `node.messageId` + mensajes cargados | "Ver en la conversación" solo aparece si el mensaje de origen está en el historial; enfoca y resalta la burbuja (`revealMessage`). |
| Lienzo (RF-42) | Las mismas `DimensionView` del plan | Proyección pura `buildCanvas` (`lib/canvas.ts`), cuadrícula estilo Lean Canvas; solo contenido validado. |
| Panel de propuestas | — | Abierto en escritorio, plegado en móvil; "Revisar" lo despliega (`openRequest`). |
| Reintento tras 502 | Texto del último mensaje | "Pedir otra respuesta" reenvía el mensaje; el aviso advierte que aparecerá dos veces (no hay endpoint de "responder otra vez"). |
| Sin conexión | Eventos `online`/`offline` | Aviso y envío bloqueado; el borrador se conserva. |
| Sugerencia de respuesta | `welcomeTopics(nodes)[0]` | Tras el último turno del coach; solo rellena el campo. |
| Descartar con plazo | — | 5 s con «Deshacer» antes de `POST …/proposals/:id` (`discard`); salir del workspace lo envía, cerrar la pestaña lo cancela. |
| «Añadir todas al plan» | Propuestas pendientes | Una petición `accept` tras otra; los errores quedan en cada tarjeta. |
| Borrador por idea | `localStorage` (`bid:draft:<id>`) | Nunca se envía solo; se borra cuando la API guarda el mensaje. |
| Guía del primer acceso | `localStorage` (`bid:tour:workspace`) | Tres pasos, diálogo no modal; botón «Guía» para repetirla. |
| Línea de tiempo | `createdAt` / `updatedAt` de mensajes y nodos | Reconstrucción por fechas; no es historial de versiones. |
| Imprimir / PDF | — | `@media print` + `print:hidden`; solo título y plan. |
| Atajos | — | `lib/shortcuts.ts` + `useShortcut`; `?` muestra la ayuda. |

### Dashboard: búsqueda, filtro y marcas

- `filterIdeas` y `countByStage` (`lib/ideas-filter.ts`) trabajan sobre las filas
  ya cargadas de `GET /api/ideas`; no se vuelve a pedir nada.
- Las diez marcas por idea salen de `statusesFromAgenda(agenda)`: una dimensión
  ausente de la agenda está validada. La API no devuelve el contenido en esta
  ruta, solo el estado.

### La bienvenida del coach

Con la conversación vacía, `CoachWelcome` muestra una burbuja del coach con tres
temas (`welcomeTopics`: primeras dimensiones sin nodo validado, en orden
canónico). Es **solo de cliente**: no existe endpoint para escribir mensajes del
coach, así que no se guarda y desaparece con el primer mensaje real. Pulsar un
tema solo rellena el compositor (`seed`) con una frase de arranque reconocible
por el extractor; no envía nada.

### La regla "la IA propone, el usuario valida" en la interfaz

- Las propuestas viven en **"Lo que hemos identificado"**, un panel separado de
  la conversación y del plan, con su estado *Pendiente*.
- En el plan, una dimensión con solo propuestas aparece como **"Por revisar"**
  y **no muestra el contenido propuesto** como si fuera del plan; ofrece
  "Revisar", que lleva al panel.
- El porcentaje y "N de 10 validadas" solo cuentan `confirmed`/`edited`.
- Cada contenido validado muestra su procedencia: *Confirmado* o *Escrito por ti*.

## 4. Responsive

| Ancho | Workspace |
|---|---|
| `≥ 1024px` | Dos columnas: conversación (flexible) + plan (22–32 rem) con scroll propio |
| `< 1024px` | Pestañas **Conversación / Plan · N%** con contador de propuestas; ambos paneles siguen montados (no se pierde borrador ni scroll) |

El compositor queda siempre abajo (altura `100dvh` menos cabecera, con
`safe-area-inset-bottom`). La cabecera del estudio pasa a un menú desplegable
con objetivos táctiles de 44–56 px. Las pantallas de acceso convierten la foto
en una franja superior en lugar de comprimir dos columnas.

### Errores inesperados

`app/error.tsx` (portada y acceso), `app/(app)/error.tsx` (estudio, con la
cabecera usable) y `app/global-error.tsx` (layout raíz, estilos en línea porque
Next lo pinta sin `globals.css`). En Next 16 reciben `retry()`.

## 5. Accesibilidad

- Enlace "Saltar al contenido"; `lang="es"`; foco visible único (ámbar).
- `role="progressbar"` con `aria-valuenow`/`aria-valuetext` en barras y anillo.
- `role="alert"` para errores, `role="status"` para avisos y cargas;
  la conversación es un `role="log"` con `aria-live="polite"`.
- Pestañas con `role="tablist"`/`tab`/`tabpanel`; desplegables con
  `aria-expanded`/`aria-controls`.
- Modales sobre `<dialog>` nativo (trampa de foco y `Escape`).
- Campos con `<label>`, `aria-invalid` y `aria-describedby`.
- `prefers-reduced-motion`: no se oculta ni anima nada (ver `motion.md`).
- Los estados no dependen solo del color: el punto de estado cambia de forma
  (anillo / medio / lleno).
- Atajos de teclado documentados en `?`; las letras nunca se activan dentro de
  un campo y no se usan combinaciones con Ctrl/Cmd del navegador.

## 6. Limitaciones reales del backend

Encontradas al integrar. **No se simularon** en el cliente.

| # | Limitación | Efecto en la UI |
|---|---|---|
| L1 | **No hay endpoint para editar el título o el resumen de una idea** (RF-12). `POST /api/ideas` solo acepta `title` y el resumen queda `""`. | El dashboard muestra "Todavía sin resumen." El panel del plan muestra el resumen solo si existe. |
| L2 | **No hay endpoint para eliminar una idea** (RF-13). | No se ofrece "Eliminar idea". |
| L3 | **No hay endpoint para editar un nodo ya validado** (RF-32). El caso de uso `editNode` existe en `application/` pero ninguna ruta lo expone. | Lo validado es de solo lectura; se corrige únicamente al resolver una propuesta. |
| L4 | **No hay endpoint de versiones** (RF-50/51). Las versiones solo salen en la exportación. | No hay vista de historial; la exportación JSON sí las incluye. |
| L5 | **`ideas.updated_at` nunca se actualiza** tras crear la idea (solo cambia el `updated_at` de los nodos). | La "fecha de actualización" del dashboard es, en la práctica, la de creación. |
| L6 | **No hay proveedor de correo.** El enlace de recuperación se escribe en el log de la API, con el token redactado salvo `AUTH_LOG_SECRETS=1`. | La pantalla de recuperación lo explica tras enviar. |
| L7 | **La cuota de extracciones vive en memoria por proceso** y se reinicia al reiniciar la API. | Solo se muestra el aviso cuando la API responde `429`. |
| L8 | **Algunos mensajes de la API usan voseo** ("Podés", "reintentá") y la interfaz usa tú. | Se muestran tal cual para no reescribir mensajes del servidor. |
| L9 | `GET /api/ideas/:id` no incluye `completion` ni `agenda`. | Se calculan en el cliente con `completionRatio`/`buildDimensionViews` sobre el mismo grafo (proyecciones puras compartidas, sin duplicar reglas). |
| L10 | **No hay endpoint para escribir un mensaje del coach.** | La bienvenida del coach es solo de cliente y no forma parte del historial. |
| L11 | **No hay endpoint para pedir otra respuesta al mismo mensaje.** | "Pedir otra respuesta" reenvía el mensaje, que queda dos veces en el historial; el aviso lo advierte. |
| L12 | **`GET /api/ideas` no devuelve el contenido de las dimensiones**, solo la agenda abierta. | Las marcas del dashboard muestran estado, no contenido. |
| L13 | **No hay historial de cambios por nodo** (solo `createdAt`/`updatedAt`) ni registro de propuestas descartadas. | La línea de tiempo es una reconstrucción por fechas y lo avisa. |
| L14 | **No hay operación en lote** para propuestas. | «Añadir todas» hace una petición por propuesta, en serie. |

## Verificación

Se ejecutó un recorrido E2E en Chromium headless contra la API real
(`COACH_PROVIDER=rehearsal`) y Postgres, con una cuenta temporal que se eliminó
al final:

registro → dashboard vacío → crear idea → enviar mensaje (stream) → extracción
con 3 propuestas → confirmar (0→1 validadas) → corregir (texto propio visible,
*Escrito por ti*) → descartar → recarga (2 de 10, estado del servidor) → árbol
técnico (10 nodos) → dashboard con progreso real → `POST /api/demo/reset` como
cuenta normal → `403` → exportación descargada → vistas móviles (390 px) →
eliminación de la cuenta → entrada con la cuenta demo → idea inexistente →
"No encontramos esa idea".

También se comprobó: con `prefers-reduced-motion` no queda ningún elemento
oculto; los elementos fuera de pantalla se revelan al hacer scroll; con sesión,
la portada ofrece "Ir a mi estudio" y oculta "Ver la demo".

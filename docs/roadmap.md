# Roadmap

Plan de construcción de BID, ordenado por fases. Cada fase deja algo
**demostrable**: no se avanza sin un entregable que se pueda mostrar.

Complementa a [`especificacion-funcional.md`](./especificacion-funcional.md)
(qué se construye) y [`arquitectura.md`](./arquitectura.md) (cómo está
organizado).

## Principio rector

**Se construye al revés: primero lo que se ve, la IA al final.**

Si el tiempo se acaba en la fase 4, ya hay una demo que funciona. Si se empieza
por la IA y falla, no hay nada que mostrar. La evaluación es en vivo, así que un
entregable visible vale más que una integración elegante a medio terminar.

---

## Estado general

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Cimiento: modelo, proyecciones, documentación | ✅ Completada |
| 1 | Persistencia y datos sembrados | ✅ Completada |
| 2 | Autenticación y cuenta demo | ✅ Completada |
| 3 | Vistas del grafo (sin IA) | ✅ Completada |
| 4 | Chat con streaming (sin extracción) | ✅ Completada |
| 5 | Extracción y confirmación de nodos | ✅ Completada |
| 6 | Historial y versiones | ⬜ Pendiente |
| 7 | Modo demo y endurecimiento | ⬜ Pendiente |

Leyenda: ✅ completada · 🟡 en curso · ⬜ pendiente · ⛔ bloqueada

> **Nota de topología.** El repositorio es un monorepo pnpm con tres paquetes:
> `packages/core` (dominio puro), `apps/api` (Hono, único que toca Postgres y
> Better Auth) y `Frontend` (Next.js, solo cliente). El cliente habla con la API
> por HTTP. No es una fase nueva: es el mismo producto de las fases 0–5, con el
> transporte separado. El detalle está en
> [`arquitectura.md`](./arquitectura.md).

---

## Fase 0 — Cimiento ✅

**Objetivo:** dejar el modelo de dominio y el patrón de diseño listos para
construir encima.

**Entregable:** scaffold de Next.js, modelo canónico, proyecciones puras,
documentación completa. Hoy ese modelo vive en `packages/core` y el scaffold en
`Frontend`.

**Cubierto:** D1–D6, RF-30 (parcial), RF-31 (parcial), RF-40 (parcial).

**Criterio de aceptación:** `pnpm typecheck`, `pnpm test` y `pnpm build` pasan en
un clon limpio. ✅

---

## Fase 1 — Persistencia y datos sembrados ✅

**Objetivo:** que una idea exista de verdad en una base de datos y se pueda
recuperar con su grafo completo.

**Entregable:**

- Esquema Postgres: `users`, `ideas`, `nodes`, `messages`, `idea_versions`.
- Repositorios en `apps/api/src/infrastructure/db/`.
- Casos de uso en `apps/api/src/application/`.
- Script de seed con **una idea demo** con el grafo completo (10 dimensiones).
- Migraciones versionadas.

**Cubierto:** RF-10, RF-11, RF-12, RF-13, RF-14, RF-34 (base).

**Criterio de aceptación:**

- Correr el seed desde cero deja la idea demo consultable.
- `findGaps` sobre la idea demo devuelve una lista vacía (todas las dimensiones
  validadas).
- Las migraciones corren en una base limpia sin intervención manual.

**Depende de:** Fase 0.

**Decisión tomada (D7):** estado actual en tabla relacional `nodes`, historial en
`idea_versions.graph` como `jsonb`. El razonamiento está en
[`especificacion-funcional.md`](./especificacion-funcional.md#d7--persistencia-del-grafo-relacional-para-el-presente-jsonb-para-el-pasado).

**Verificado:**

- `pnpm db:migrate` sobre una base vacía crea las cinco tablas.
- `pnpm db:seed` deja 10 nodos confirmados y reporta `gaps: 0`.
- Correr el seed dos veces deja exactamente los mismos conteos (idempotente).
- 41 tests pasan, incluidos los de integración contra Postgres real.

---

## Fase 2 — Autenticación y cuenta demo ✅

**Objetivo:** que un usuario pueda entrar, y que la demo tenga una puerta de un
solo click.

**Entregable:**

- Registro, login, logout, recuperación de contraseña.
- Sesiones con token corto + refresh.
- Cuenta demo con credenciales fijas y login de un click.
- Protección de rutas.

**Cubierto:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RNF-01..04.

**Criterio de aceptación:**

- Un usuario nuevo se registra, cierra sesión y vuelve a entrar.
- La cuenta demo entra con un click, sin tipear nada.
- Una ruta protegida sin sesión redirige al login.
- No se puede acceder a ideas de otro usuario.

**Depende de:** Fase 1.

**Riesgo:** escribir auth a mano. Usar Better Auth y no reinventarlo.

**Verificado:**

- Un usuario nuevo se registra, entra, ve el dashboard vacío, cambia su email,
  cambia su contraseña, exporta sus datos y elimina su cuenta. Después de
  borrar, el login con esas credenciales falla.
- La cuenta demo entra con un click (`demo@bid.local` / `demo1234`) y muestra
  la idea sembrada al 100 %, sin huecos.
- `/dashboard` y `/profile` sin sesión devuelven `307` a `/sign-in`.
- Una idea de otro usuario devuelve `IdeaNotFoundError`, no "prohibido".
- El login con contraseña incorrecta y con email inexistente devuelven el
  mismo mensaje y el mismo `401`.
- El logout invalida la sesión en el servidor: la cookie vieja deja de
  funcionar.
- 52 tests pasan (44 sin base de datos, 52 con `TEST_DATABASE_URL`).

**Limitación conocida:** no hay proveedor de correo. El enlace de recuperación
y el de verificación de email se escriben en el log del servidor. El flujo
completo —token de un solo uso, expiración, cambio de contraseña— está
implementado y probado; lo que falta es el transporte. También falta el rate
limiting de RNF-03 y RNF-04.

---

## Fase 3 — Vistas del grafo (sin IA) ✅

**Objetivo:** ver la idea. Esta es la fase donde el producto se vuelve visible.

**Entregable:**

- Vista árbol con React Flow, derivada de `buildTree`.
- Vista card con estado y porcentaje de completitud.
- Indicador de completitud por dimensión (`completionRatio` + `findGaps`).
- Navegación entre listado → idea → vistas.

**Cubierto:** RF-40, RF-41, RF-43, RF-60 (responsive base).

**Criterio de aceptación:**

- La idea demo se ve completa en árbol y en card.
- Las dimensiones vacías se distinguen visualmente de las llenas.
- Funciona en viewport móvil sin scroll horizontal.

**Depende de:** Fases 1 y 2.

**Riesgo:** tentación de pulir el árbol de más. Es una vista, no el producto.

**Verificado:**

- La idea demo se ve completa en las dos vistas: 100 %, diez dimensiones, sin
  huecos.
- Una idea vacía muestra las diez dimensiones abiertas, con borde punteado y
  atenuadas, tanto en la card como en el árbol.
- En viewport de 390 px no hay scroll horizontal: `scrollWidth` es igual a
  `clientWidth`.
- El árbol tiene diez nodos y ocho aristas, que son las relaciones de
  `NODE_PARENT`.
- Sin errores de consola.

**Decisiones que quedaron:**

- **El layout del árbol es una proyección propia, no una librería.** La
  jerarquía ya es un árbol, así que un recorrido en profundidad alcanza. El
  resultado es determinista y testeable, que es lo que una librería de layout no
  da.
- **El árbol se renderiza solo en el cliente.** React Flow necesita medir el
  DOM para saber el tamaño de un nodo, y en el servidor no hay navegador. El
  motivo está anotado en `odd/tasks/fase-3-vistas.md`, L4.

---

## Fase 4 — Chat con streaming (sin extracción) ✅

**Objetivo:** conversar. Todavía sin estructura automática.

**Entregable:**

- Ruta `app/api/chat/route.ts` con streaming.
- UI de chat con historial de mensajes persistido.
- Contexto armado como: system prompt + grafo + últimos N mensajes.
- Manejo de error y reintento.

**Cubierto:** RF-20, RF-21 (base), RF-25.

**Criterio de aceptación:**

- El primer token aparece en menos de 2 segundos en condiciones normales.
- El historial sobrevive a un refresh.
- Si el proveedor falla, el usuario ve un error claro y no pierde la
  conversación.

**Depende de:** Fase 2.

**Riesgo:** latencia del proveedor durante la demo. Elegir uno rápido y precalentar.

> **Punto de corte seguro.** Al terminar esta fase hay una demo mostrable de
> punta a punta, aunque la extracción no exista.

**Decisión que lo habilitó:** la capa de IA se habla con un puerto
(`CoachModel`) que tiene dos implementaciones: una que responde desde un guion
y otra que llama al proveedor. El guion es el **default**, así que la app
funciona sin API key y sin red (RNF-15).

**Verificado:**

- El coach pregunta por la primera dimensión abierta, en el orden que decide
  `findGaps`. Con la idea completa, avisa que no queda nada por confirmar.
- El historial sobrevive a un refresh: los mensajes viven en la tabla
  `messages`.
- El streaming es real: el texto crece en el DOM mientras llega (46 chars a los
  600 ms, 153 a los 1000 ms).
- Si el modelo falla, el mensaje del usuario **queda guardado** y el error es
  visible (RF-25).
- Sin errores de consola, sin scroll horizontal a 390 px.

**Lo que falta:** la API key y `COACH_PROVIDER=live`. La implementación del
proveedor ya está escrita; cuando haya key, se activa sin tocar la aplicación.

---

## Fase 5 — Extracción y confirmación de nodos ✅

**Objetivo:** el corazón del producto. La conversación produce estructura.

**Entregable:**

- Llamada de extracción con salida estructurada validada por Zod.
- Nodos propuestos entran como `inferred`.
- UI de confirmación (aceptar / corregir).
- Edición directa habilitada solo en nodos `confirmed`.
- Regla de merge `edited > confirmed > inferred`.
- Detección de huecos alimentando la siguiente pregunta del coach.
- Cuotas de uso.

**Cubierto:** RF-22, RF-23, RF-24, RF-30, RF-31, RF-32, RF-33, RF-26.

**Criterio de aceptación:**

- Un mensaje que describe el modelo de ingresos genera una propuesta de nodo
  `revenue` en estado `inferred`.
- Confirmarlo lo pasa a `confirmed` y **el árbol se actualiza**.
- Un nodo `edited` no es sobrescrito por una nueva extracción.
- La extracción no corre en cada mensaje.
- Alcanzar la cuota muestra un mensaje claro, no un corte silencioso.

**Depende de:** Fases 3 y 4.

**Riesgo:** la extracción alucina estructura que el usuario no dijo. Mitigación:
`inferred` + confirmación explícita (D2).

> **Este es el momento de la demo.** El nodo apareciendo en el árbol mientras el
> jurado mira es lo que prueba toda la arquitectura.

**Verificado:**

- Un mensaje que describe el ingreso propone un nodo `revenue` en estado
  `inferred`, con el `message_id` del mensaje que lo originó y la confianza del
  modelo.
- Confirmarlo lo pasa a `confirmed`, el panel desaparece y el árbol y la card
  se actualizan en el mismo round trip.
- Corregir un nodo lo deja en `edited`; una extracción posterior **no** lo
  sobrescribe ni lo duplica.
- Una dimensión ya confirmada no recibe propuestas nuevas; una que tiene una
  propuesta pendiente tampoco (no se apilan preguntas sin responder).
- La extracción es una ruta aparte (`/api/extract`) que corre después de que el
  coach respondió: si falla, el chat no se rompe.
- Un JSON inválido se descarta entero: no se persiste nada.
- La cuota se avisa antes de cortar: al alcanzarla, la ruta responde `429` con
  un mensaje visible y el usuario puede seguir conversando.

**Lo que falta:** la misma deuda que el chat: la implementación del proveedor
(`ProviderExtractor`) está escrita y se activa con `COACH_PROVIDER=live`.

---

## Fase 6 — Historial y versiones

**Objetivo:** que la idea tenga memoria de cómo evolucionó.

**Entregable:**

- Snapshot inmutable del grafo por cada cambio confirmado.
- Lista de versiones con fecha.
- Diff visual entre dos versiones.
- Navegación de un nodo al mensaje que lo originó.

**Cubierto:** RF-50, RF-51, RF-52.

**Criterio de aceptación:**

- Tras confirmar un nodo nuevo aparece una versión adicional.
- El diff muestra exactamente qué nodo se agregó o modificó.
- Desde un nodo se llega al mensaje original.

**Depende de:** Fase 5.

**Riesgo:** guardar snapshots completos puede crecer rápido. Para un proyecto de
facultad es aceptable; no optimizar antes de necesitarlo.

---

## Fase 7 — Modo demo y endurecimiento

**Objetivo:** que la demo en vivo no se caiga por nada.

**Entregable:**

- Fallback sin IA con streaming simulado.
- Botón de reset que restaura el estado sembrado.
- Precalentamiento del proveedor antes de la presentación.
- Guion de 90 segundos ensayado.

**Cubierto:** RF-70, RF-71, RF-72, RF-73, RF-74, RNF-15, RNF-16, RNF-17.

**Criterio de aceptación:**

- Con `DEMO_MODE=true` y sin clave de API, el recorrido completo funciona.
- El reset devuelve el estado sembrado en menos de 5 segundos.
- El guion se completa en 90 segundos sin pasos manuales fuera de la UI.

**Depende de:** Fase 5 (mínimo). Puede hacerse en paralelo desde la fase 4.

---

## Camino crítico

```
0 ──▶ 1 ──▶ 2 ──▶ 4 ──▶ 5 ──▶ 7
             └──▶ 3 ──▶ 5
                         └──▶ 6
```

La fase 3 puede ir en paralelo con la 2. La fase 6 puede recortarse sin afectar
la demo. La 7 depende de la 5 pero conviene empezarla temprano.

---

## Qué recortar si el tiempo aprieta

En este orden, de menos a más doloroso:

1. **Fase 6 completa** — el historial impresiona pero no prueba nada que la fase 5
   no pruebe ya.
2. **RF-42 / RF-44 (canvas y múltiples lentes)** — el árbol alcanza para
   demostrar el patrón de proyecciones.
3. **RF-15 (búsqueda y filtros)** — con tres ideas no hace falta.
4. **RF-61 (i18n)** — español solamente.
5. **RF-24 (cuotas)** — solo si el proveedor es gratis y controlado.

**Nunca recortar:** la fase 7. Un fallo del proveedor frente al jurado cuesta
más que cualquier feature faltante.

---

## Decisiones que bloquean fases

| Decisión | Bloquea | Estado |
|---|---|---|
| Proveedor de IA | Fases 4, 5, 7 | Pendiente — candidato: Gemini |
| Modelo de datos relacional vs `jsonb` | Fase 1 | Resuelto: híbrido (D7) |
| Primera lente metodológica | Fase 3 (opcional) | Pendiente — candidata: Lean Canvas |
| Alcance de i18n | Fase 3 en adelante | Pendiente |

---

## Definición de terminado

Una fase está terminada cuando:

- El entregable existe y se puede mostrar.
- Los criterios de aceptación se verificaron a mano, no de memoria.
- `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.
- Si tocó el dominio, hay test que lo cubre.
- El commit correspondiente está en el historial con un mensaje convencional.

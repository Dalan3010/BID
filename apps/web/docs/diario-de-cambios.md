# Diario de cambios del cliente

Registro de cada cambio de `apps/web`, del más reciente al más antiguo. Cada
entrada dice **qué** cambió, **por qué**, **qué archivos** toca y **cómo se
verificó**.

---

## 2026-11-07 — Once mejoras más, todas de frontend

Ningún endpoint nuevo ni cambio en `apps/api`. Dos de ellas añaden
**dependencias de desarrollo** a `apps/web` (tests), sin efecto en producción.

### 1. Atajos de teclado

| Atajo | Dónde | Acción |
|---|---|---|
| `?` | Todo el estudio | Abre la ayuda de atajos |
| `/` | Dashboard | Enfoca el buscador |
| `N` | Dashboard | Nueva idea |
| `/` | Workspace | Enfoca el campo de escritura |
| `Alt+1` / `Alt+2` | Workspace | Ir a la conversación / al plan (también mientras escribes) |
| `Esc` | Dentro de «Lo que hemos identificado» | Pliega el panel |

**Cómo:** `src/lib/shortcuts.ts` tiene el catálogo (`SHORTCUTS`, que alimenta la
ayuda) y las reglas puras: `matchesShortcut` (nunca con Ctrl/Cmd, para no robar
atajos del navegador; los dígitos se comparan por `event.code` porque en macOS
`Alt+1` produce «¡») e `isTypingTarget` (las letras no se activan dentro de un
campo). El hook `useShortcut` los conecta y se desactiva si hay un `<dialog>`
abierto. La ayuda (`ShortcutsHelp`) está en el `AppShell`.

### 2. Borrador guardado por idea

**Qué:** lo que escribes y no envías sigue ahí al volver a la idea.
**Cómo:** `src/lib/drafts.ts` lo guarda en `localStorage` con la clave
`bid:draft:<idea>`. Nunca se envía solo; se borra cuando la API guarda el
mensaje. Si el almacenamiento falla (modo privado, cuota), el compositor sigue
funcionando sin guardar.

### 3. «Añadir todas al plan»

**Qué:** con dos o más propuestas, un botón las confirma todas, **una petición
tras otra**, mostrando «Añadiendo 2 de 3…». Si alguna falla, el error queda en su
tarjeta y las demás siguen.
**Nota de producto:** es un atajo; cada propuesta sigue pasando por
`POST /proposals/:id` y el plan solo cambia con lo que responde la API.

### 4. Deshacer al descartar

**Qué:** al pulsar «Descartar», la tarjeta muestra el texto tachado, «Deshacer»
y una línea que se vacía en **5 segundos**. Solo al terminar se llama a la API.
**Decisiones:**
- Durante esos 5 s **no se ha guardado nada**, y la tarjeta lo dice.
- Si sales del workspace dentro del plazo, el descarte se envía en ese momento
  (respeta tu decisión). Si cierras la pestaña, se pierde y la propuesta sigue
  existiendo (no se pierde información).
**Cómo:** `scheduleDiscard` / `undoDiscard` en `use-workspace.ts`
(`DISCARD_DELAY_MS = 5000`); `DiscardCountdown` en `proposal-card.tsx`.

### 5. Guía del primer acceso

**Qué:** la primera vez que abres un workspace, una tarjeta recorre tres pasos
(conversación, «Lo que hemos identificado», plan), señala cada zona con un
contorno ámbar y, en móvil, cambia de pestaña. Botón «Guía» en la cabecera para
repetirla. `Esc` o «Saltar» la cierran.
**Cómo:** pasos y recuerdo en `src/lib/onboarding.ts` (clave
`bid:tour:workspace`); `WorkspaceTour` es un `role="dialog"` **no modal** (la
página sigue usable) situado arriba, para no tapar el compositor ni el plan.

### 6. Imprimir / Guardar como PDF

**Qué:** botón «Imprimir / PDF» en el plan. Se imprime solo el título, la fecha y
las diez dimensiones, en tinta oscura sobre blanco; sin chat, botones ni
navegación, y sin partir una dimensión entre páginas.
**Cómo:** variante `print:hidden` / `print:block` en los componentes y un bloque
`@media print` en `globals.css`.
**Lección:** primero se intentó redefinir los tokens de color en `@media
print`, pero Tailwind compila las variantes con opacidad (`bg-ink-950/90`) a
colores fijos, y la redefinición no las alcanzaba. Se cambió a reglas de
impresión explícitas.

### 7. Línea de tiempo

**Qué:** «Ver línea de tiempo» en el plan: mensajes, propuestas y validaciones
ordenados por fecha y agrupados por día; cada mensaje permite «Ver en la
conversación».
**Límite (documentado en la propia vista):** se reconstruye con las fechas
reales (`createdAt` / `updatedAt`). **No es un historial de versiones**: una
propuesta descartada ya no existe y no aparece, y un dato editado dos veces
muestra solo su último cambio.
**Cómo:** proyección pura `buildTimeline` en `src/lib/timeline.ts`.

### 8. Imágenes optimizadas

**Qué:** se quitó `images.unoptimized`. `next/image` sirve ahora cada foto en
**AVIF/WebP** al ancho que pide su `sizes`, en lugar del JPEG de 2000 px.
Medido: la cabecera del dashboard pasó de un JPEG de 200-600 KB a un AVIF de
78 KB; las miniaturas pesan 3-7 KB.
**Por qué es seguro:** el optimizador es `sharp`, que Next.js ya instala como
dependencia propia (0.35.5); no hubo que añadir nada.

### 9. Tests de componentes

**Qué:** 13 tests de React con Testing Library en jsdom:
- `proposal-card.test.tsx`: confirmar, corregir (envía el texto recortado),
  descartar inicia el plazo y no llama a la API, «Deshacer», y el error de la
  API se muestra en la tarjeta.
- `composer.test.tsx`: Intro envía y Mayús+Intro no; devuelve el texto si no se
  guardó; bloqueado sin conexión o mientras responde; borrador por idea; `seed`.
- `idea-filters.test.tsx`: búsqueda, filtro y que el buscador cuenta como
  campo de escritura (los atajos de una letra no se activan dentro).

**Cómo:** dependencias de desarrollo `@testing-library/react`,
`@testing-library/dom`, `@testing-library/user-event` y `jsdom`. Cada archivo
`.test.tsx` declara `// @vitest-environment jsdom`. `src/test/setup.ts` simula
`matchMedia` con movimiento reducido (las animaciones no corren en los tests) y
limpia el DOM y `localStorage` entre tests.
**Un test encontró un fallo real:** el compositor ignoraba un `seed` presente
al montarse. Corregido.

### 10. Prueba E2E dentro del repo

**Qué:** `pnpm --filter @bid/web e2e` ejecuta con Playwright 10 pruebas contra la
API real. Ver `e2e/README.md`.
- Recorrido con una cuenta temporal que **se elimina al final**.
- Cuenta demo **solo en lectura**: búsqueda y filtro, guía del primer acceso e
  idea inexistente.

**Cómo:** dependencia de desarrollo `@playwright/test` (1.65), configuración en
`playwright.config.ts`, pruebas en `e2e/`. Si no quieres descargar el Chromium
de Playwright, `BID_E2E_CHROMIUM` acepta la ruta de uno existente.
**Endurecimiento:** la primera versión del test de descartar pasaba sin
comprobar que la petición llegara a enviarse (el botón desaparece al instante
por el «Deshacer»). Ahora espera a que termine la cuenta atrás y, tras
recargar, verifica contra el servidor que la propuesta ya no existe.

### 11. Páginas de error

**Qué:** fallos inesperados de React muestran una pantalla del estudio («No
pudimos mostrar esta parte»), que aclara que los datos están guardados en el
servidor, con «Reintentar» y «Volver al estudio».
**Cómo:**
- `src/app/error.tsx`: portada y acceso, con fotografía.
- `src/app/(app)/error.tsx`: dentro del estudio; la cabecera sigue usable.
- `src/app/global-error.tsx`: si falla el layout raíz. Next lo pinta sin
  `globals.css`, por eso usa estilos en línea.

**Detalle de Next 16:** el prop de reintento se llama **`retry`** (antes
`reset`), y vuelve a pedir y renderizar el segmento.

### Arreglos encontrados al probar

- El panel del plan tenía a la vez `aria-labelledby` (la pestaña) y
  `aria-label`. Se dejó solo `aria-labelledby`, que es lo correcto en un
  `tabpanel`.
- La tarjeta de la guía, abajo, tapaba el compositor en el paso que lo señala.
  Se subió y, en escritorio, se alinea dentro de la columna de conversación.

### Nota de entorno

Durante la prueba, `pnpm dev` siguió sirviendo una versión vieja de
`globals.css` tras editarlo. Reiniciar `pnpm dev` lo resolvió. Si un cambio de
estilos no aparece en desarrollo, reinicia el servidor.

### Archivos

| Archivo | Cambio |
|---|---|
| `next.config.ts` | Optimización de imágenes (AVIF/WebP) |
| `package.json` | Script `e2e`; dependencias de desarrollo de tests |
| `vitest.config.mts` | Incluye `*.test.tsx` y el archivo de setup |
| `playwright.config.ts`, `e2e/*` | **Nuevos**: suite E2E y su README |
| `src/test/setup.ts` | **Nuevo** |
| `src/app/error.tsx`, `src/app/(app)/error.tsx`, `src/app/global-error.tsx` | **Nuevos** |
| `src/app/globals.css` | Contorno de la guía y bloque de impresión |
| `src/lib/shortcuts.ts`, `drafts.ts`, `onboarding.ts`, `timeline.ts` (+ tests) | **Nuevos** |
| `src/components/shortcuts/*` | **Nuevos**: `useShortcut`, `ShortcutsHelp` |
| `src/components/ui/error-state.tsx` | **Nuevo** |
| `src/components/workspace/workspace-tour.tsx`, `idea-timeline.tsx` | **Nuevos** |
| `src/components/workspace/use-workspace.ts` | Descartar con plazo, deshacer, aceptar todas |
| `src/components/workspace/proposal-card.tsx`, `proposal-tray.tsx` | Cuenta atrás, «Deshacer», «Añadir todas», `Esc` |
| `src/components/workspace/composer.tsx` | Borrador por idea; `seed` al montar |
| `src/components/workspace/workspace-view.tsx` | Atajos, guía, impresión, accesibilidad del panel |
| `src/components/workspace/plan-panel.tsx`, `dimension-entry.tsx` | Imprimir, línea de tiempo, clases de impresión |
| `src/components/dashboard/studio-view.tsx`, `idea-filters.tsx` | Atajos `/` y `N` |
| `src/components/navigation/app-shell.tsx`, `app-header.tsx` | Ayuda de atajos; cabecera oculta al imprimir |
| `.gitignore` (raíz) | Ignora `apps/web/test-results/` y `playwright-report/` |

### Verificación

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (73 tests: 60 de lógica y 13 de
  componentes) y `pnpm build` en verde.
- `pnpm --filter @bid/web e2e`: **10 de 10** contra la API real. No quedan
  cuentas `e2e-*` en la base.
- Revisión visual:
  - ayuda de atajos y `N` abre «Una idea nueva»;
  - la guía en el workspace demo;
  - la línea de tiempo;
  - PDF real del plan (2 páginas A4, tinta sobre blanco);
  - imágenes servidas como `image/avif`.

---

## 2026-11-07 — Siete mejoras solo de frontend

Todas usan la API tal como está: ningún endpoint nuevo ni cambio en
`apps/api`.

### 1. Panel de propuestas plegado en móvil

**Qué:** en pantallas de menos de 1024 px, "Lo que hemos identificado" empieza
plegado (solo "N por revisar") y las propuestas nuevas no lo despliegan solas.
En escritorio se comporta como antes. "Revisar" en el plan lo despliega en
cualquier pantalla.
**Por qué:** desplegado tapaba casi toda la conversación en el móvil.
**Cómo:** `ProposalTray` lee el ancho con `matchMedia` en el inicializador del
estado (seguro: el workspace solo se pinta en el navegador) y recibe
`openRequest`, un número que cambia al pulsar "Revisar".

### 2. "Pedir otra respuesta" tras un 502

**Qué:** si el coach falla con 502, el aviso ofrece "Pedir otra respuesta".
**Por qué y límite:** con un 502 la API **ya guardó** el mensaje (RF-25) y no
existe un endpoint de "responder otra vez". La única forma de pedir respuesta
es reenviar el mensaje, que entonces aparece **dos veces** en el historial. El
aviso lo dice antes de pulsar. En los demás fallos (400, red) el mensaje no se
guardó y el texto ya vuelve al campo de escritura, así que no hace falta botón.
**Cómo:** `TurnNotice.retryContent` en `use-workspace.ts` (solo se rellena con
502); el botón llama a `send(retryContent)`.

### 3. Trazabilidad: "Ver en la conversación" (RF-52)

**Qué:** cada propuesta y cada dato validado del plan ofrecen "Ver en la
conversación". Cambia a la pestaña de conversación (en móvil), desplaza hasta el
mensaje que originó el dato, le pasa el foco y le ilumina el borde un momento.
**Por qué:** cada nodo trae `messageId` desde la API; mostrar de dónde salió
cada afirmación es lo que da sentido a la procedencia.
**Cómo:** cada burbuja tiene `id="mensaje-<id>"` (`messageAnchor`).
`WorkspaceView.traceAction(messageId)` devuelve la acción **solo** si ese mensaje
está en el historial cargado; si no, el botón no aparece. `revealMessage` hace
el desplazamiento, el foco y el destello (Anime.js, `box-shadow`, sin dejar
estilos residuales; sin animación con movimiento reducido).

### 4. Buscar y filtrar en el dashboard (RF-15)

**Qué:** buscador por nombre o resumen (sin distinguir mayúsculas ni tildes:
"cafe" encuentra "Café") y filtro por estado: *Todas, Sin empezar, En curso,
Completas*, cada uno con su contador. Estado vacío "Ninguna idea coincide" con
"Quitar filtros".
**Cómo:** funciones puras en `src/lib/ideas-filter.ts` sobre las filas ya
cargadas de `GET /api/ideas`. El estado sale del dato real: 0 validadas → sin
empezar; 0 huecos → completa; el resto, en curso.

### 5. Vista "Lienzo" (RF-42)

**Qué:** botón "Ver como lienzo" en el panel del plan. Abre la idea completa en
una página, en una cuadrícula inspirada en el *Lean Canvas* (en móvil, los
bloques se apilan).
**Por qué:** demuestra la idea central de la arquitectura: una metodología es una
**función** del grafo, no datos nuevos.
**Cómo:** `src/lib/canvas.ts` (`CANVAS_BLOCKS`, `CANVAS_TEMPLATE`,
`buildCanvas`) coloca las mismas `DimensionView` que usa el plan. El hueco de
"ventaja injusta" del Lean Canvas lo ocupa *Riesgos*, porque BID no tiene esa
dimensión y no se inventa contenido. Como el plan, solo muestra lo validado.
`Modal` ganó `size="full"`.

### 6. Marcas por dimensión en el dashboard (RF-43)

**Qué:** bajo la barra de progreso de cada idea, diez marcas en orden canónico:
llena = validada, mitad = con propuestas pendientes, contorno = abierta. Cada una
tiene tooltip y texto para lectores de pantalla.
**Límite:** `GET /api/ideas` solo devuelve las dimensiones **abiertas**
(`agenda`), así que se conoce el estado pero no el contenido.
**Cómo:** `statusesFromAgenda` en `src/lib/dimensions.ts`: lo que no está en
la agenda está validado.

### 7. Pulido del chat

- **Sugerencia de respuesta:** tras la última respuesta del coach, "Responder
  sobre *Segmento* · “Mis clientes son…”", sobre la primera dimensión abierta.
  Solo rellena el campo, como los temas de la bienvenida.
- **Copiar:** cada mensaje del coach tiene "Copiar" (portapapeles), con
  confirmación "Copiado" o "No se pudo copiar".
- **Sin conexión:** al perder la red aparece "Sin conexión"; se puede seguir
  escribiendo pero no enviar. Al volver la red se reactiva el envío.
  `use-online.ts` usa `useSyncExternalStore` con los eventos `online` y
  `offline`.

### Archivos

| Archivo | Cambio |
|---|---|
| `src/lib/ideas-filter.ts` | **Nuevo**: `ideaStage`, `filterIdeas`, `countByStage`, `normalize` |
| `src/lib/canvas.ts` | **Nuevo**: proyección del lienzo |
| `src/lib/dimensions.ts` | `statusesFromAgenda` |
| `src/lib/studio.test.ts` | **Nuevo**: tests de filtro, marcas y lienzo |
| `src/components/dashboard/idea-filters.tsx` | **Nuevo**: buscador y filtro |
| `src/components/dashboard/studio-view.tsx` | Filtrado y estado "Ninguna idea coincide" |
| `src/components/dashboard/idea-entry.tsx` | `DimensionMarks` |
| `src/components/workspace/canvas-dialog.tsx` | **Nuevo**: el lienzo |
| `src/components/workspace/copy-button.tsx` | **Nuevo** |
| `src/components/workspace/use-online.ts` | **Nuevo** |
| `src/components/workspace/workspace-view.tsx` | Trazabilidad, sin conexión, reintento, apertura del panel |
| `src/components/workspace/use-workspace.ts` | `retryContent` en el aviso de 502 |
| `src/components/workspace/message-entry.tsx` | `id` por mensaje, acciones junto a la hora, `data-bubble` |
| `src/components/workspace/conversation.tsx` | Sugerencia de respuesta |
| `src/components/workspace/composer.tsx` | Prop `offline` |
| `src/components/workspace/proposal-tray.tsx` | Plegado en móvil, `openRequest`, trazabilidad |
| `src/components/workspace/proposal-card.tsx` | "Ver en la conversación" |
| `src/components/workspace/dimension-entry.tsx` | "Ver en la conversación"; `TraceButton` |
| `src/components/workspace/plan-panel.tsx` | Botón y diálogo del lienzo |
| `src/components/ui/modal.tsx` | `size="full"` |

### Verificación

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (50 tests) en verde.
- Recorrido en Chromium contra la API real:
  - Dashboard con la cuenta demo, solo lectura:
    - filtros "Todas 10 · Sin empezar 7 · En curso 2 · Completas 1";
    - "cafe" encuentra la idea del café;
    - "zzz" muestra "Ninguna idea coincide";
    - 10 marcas por idea.
  - Workspace con una cuenta temporal, eliminada al final:
    - sugerencia "Problema · “El problema es que…”";
    - "Copiar" llena el portapapeles;
    - "Ver en la conversación" enfoca el mensaje de origen;
    - tras confirmar, el plan ofrece la trazabilidad;
    - el lienzo muestra 10 bloques;
    - sin red: aviso y envío bloqueado; con red, envío reactivado;
    - 502 simulado interceptando la petición (no guarda nada): aparece "Pedir
      otra respuesta" y el campo no recupera el texto;
    - en móvil, el panel empieza plegado y "Revisar" lo despliega.
  - Sin errores de consola.

---

## 2026-11-07 — Conversación con burbujas y bienvenida del coach

### Qué cambió

1. **Burbujas de chat.** Los mensajes dejan de verse como una transcripción
   (columna de etiqueta + texto) y pasan a burbujas:
   - el coach, a la izquierda, con un avatar tipográfico (una "c" en serif
     itálica dentro de un anillo bronce) y burbuja grafito con borde fino;
   - la persona, a la derecha, en una burbuja más clara y sin avatar;
   - la esquina más cercana a quien habla es recta, para que la burbuja
     "apunte" a su autor; la hora (o "enviando" / "escribiendo") va debajo;
   - el indicador "Pensando contigo…" aparece junto al avatar del coach.
2. **Bienvenida del coach.** Con la conversación vacía se muestra una burbuja
   del coach que saluda, explica el método y ofrece **tres temas** para empezar
   (las tres primeras dimensiones abiertas, en el orden de la agenda). Al pulsar
   un tema, el campo de escritura se rellena con el inicio de una frase
   ("El problema es que …") y queda enfocado con el cursor al final; la persona
   la completa y la envía.

### Decisiones y por qué

- **La bienvenida no se guarda.** La API no tiene un endpoint para escribir
  mensajes del coach; el único camino es `POST /messages`, que guarda un
  mensaje **del usuario** y genera la respuesta. Por eso la bienvenida vive solo
  en el cliente y desaparece en cuanto existe el primer mensaje real.
- **Los temas salen del dominio, no se inventan.** `welcomeTopics` usa
  `buildDimensionViews`, que aplica la misma regla que `findGaps` de
  `@bid/core`: una dimensión está abierta si no tiene un nodo `confirmed` o
  `edited`. Una dimensión que solo tiene propuestas (`inferred`) sigue abierta.
- **Pulsar un tema no envía nada.** Solo rellena el campo: la persona decide qué
  escribe.
- **Cada frase de arranque es reconocible por el extractor.** La primera
  versión decía "El problema que quiero resolver es…", que **no** coincide con
  el patrón del extractor de guion (`/el problema (?:es|era)/`); en la prueba,
  esa frase terminó propuesta como *segmento*. Se reescribieron cinco frases
  para que coincidan con los patrones reales de
  `apps/api/src/infrastructure/ai/rehearsal-extractor.ts`, y un test las
  vigila.

### Archivos

| Archivo | Cambio |
|---|---|
| `src/components/workspace/message-entry.tsx` | Reescrito: `MessageEntry` en burbuja; nuevos `ChatBubble` (marco reutilizable) y `CoachAvatar` |
| `src/components/workspace/coach-welcome.tsx` | **Nuevo**: burbuja de bienvenida con los temas |
| `src/components/workspace/conversation.tsx` | Muestra `CoachWelcome` si no hay mensajes; avatar junto al indicador |
| `src/components/workspace/composer.tsx` | Nueva prop `seed` para rellenar el campo desde fuera |
| `src/components/workspace/workspace-view.tsx` | Calcula los temas y conecta la bienvenida con el compositor |
| `src/components/workspace/proposal-tray.tsx` | La etiqueta "N por revisar" ya no se parte en móvil |
| `src/lib/dimensions.ts` | Campo `starter` en cada dimensión; nueva función `welcomeTopics` |
| `src/lib/dimensions.test.ts` | Tests de `welcomeTopics` |
| `src/lib/starters.test.ts` | **Nuevo**: cada frase de arranque coincide con el patrón del extractor (copia documentada de los patrones de la API) |
| `src/components/profile/account-view.tsx` | Arreglo: tras eliminar la cuenta se va a la portada (ver abajo) |

### Arreglo encontrado durante la prueba

Al **eliminar la cuenta**, la sesión desaparece en ese instante y el guard del
estudio (`useRequireSession`) ganaba la carrera a `router.replace("/")`: la
persona terminaba en `/sign-in?next=/profile`. Ahora se usa una navegación
completa (`window.location.replace("/")`), que no compite con el guard. La
cuenta se borraba bien también antes; solo fallaba el destino.

### Cómo funciona el relleno del campo (`seed`)

`WorkspaceView` guarda `{ text, at }` al pulsar un tema. `Composer` compara
`seed.at` con el último aplicado **durante el render** (patrón de React para
derivar estado de un cambio de prop, sin `setState` dentro de un efecto) y
sustituye el texto; después, un efecto enfoca el campo, mueve el cursor al final
y ajusta la altura. `at` cambia en cada clic, así que pulsar dos veces el mismo
tema vuelve a rellenar.

### Comportamientos del backend observados (no son cambios)

- Si la persona responde pero **no valida** la propuesta, el coach de guion
  repite la misma pregunta: su agenda (`findGaps`) no cuenta los nodos
  `inferred`. Es el comportamiento esperado del dominio (una propuesta es una
  pregunta, no una respuesta).
- El extractor de guion clasifica por patrones de texto, así que una misma frase
  puede caer en otra dimensión si contiene la palabra clave de esa otra
  dimensión (p. ej. "oficinas pequeñas" activa *segmento*).

### Verificación

- `pnpm lint`, `pnpm typecheck` y `pnpm test` (43 tests) en verde.
- Recorrido en Chromium contra la API real, con una cuenta temporal que se
  eliminó al final (comprobado en la base: no quedan cuentas `e2e-*`):
  la bienvenida ofrece *Problema, Segmento, Propuesta de valor*; al pulsar
  *Problema* el campo queda en "El problema es que " y enfocado; tras enviar
  aparecen las burbujas, el coach responde y la bienvenida desaparece; vista
  móvil a 390 px; sin errores de consola.

---

## 2026-11-07 — Construcción inicial del cliente "BID Creative Studio"

Creación de `apps/web` desde cero (la carpeta no existía), conectado a la API
existente sin cambiar contratos ni tocar `apps/api`, `packages/core` ni las
migraciones.

- Sistema de diseño (tokens en `globals.css`), fuentes locales y fotografía
  etalonada.
- Portada, autenticación (entrar, crear cuenta, recuperar y restablecer
  contraseña, cuenta demo), dashboard, workspace (conversación con stream,
  extracción, propuestas, plan de 10 dimensiones y árbol técnico) y cuenta
  (exportar, reiniciar demo, perfil, contraseña, eliminar).
- Movimiento con Anime.js 4 (ver `motion.md`).
- 30 tests de `src/lib` y recorrido E2E contra la API real.

Detalle completo en [`../README.md`](../README.md) y
[`arquitectura-cliente.md`](arquitectura-cliente.md).

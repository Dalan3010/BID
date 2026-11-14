# Sistema de diseño — BID Creative Studio

Todo token vive en `src/app/globals.css` dentro de `@theme`. Tailwind 4 genera
las utilidades a partir de ellos (`bg-ink-950`, `text-paper`, `border-line`,
`px-gutter`, `max-w-studio`, `text-display`…). **No se usan colores sueltos en
los componentes.**

## Color

| Token | Valor | Uso |
|---|---|---|
| `ink-950` | `#0F0F0F` | Fondo de página |
| `ink-900` | `#161616` | Superficies elevadas (paneles clay, turnos del coach) |
| `ink-850` | `#1B1B1B` | Cara superior de los degradados clay, hover |
| `ink-800` | `#1F1F1F` | Hundido: campos, pozos, skeletons |
| `ink-700` | `#292929` | Hover sobre grafito |
| `stone` | `#8A8578` | Texto terciario, etiquetas inactivas (5.2:1 sobre el fondo, 4.9:1 sobre panel) |
| `mist` | `#C9C3B6` | Texto secundario |
| `paper` | `#E6DEC5` | Texto principal (crema); cara del botón primario |
| `bronze` | `#A77850` | Acento: confirmar al plan, marcas editoriales |
| `amber` | `#B66F43` | Foco, estado "por revisar" |
| `sage` | `#8F9A7E` | Estado validado |
| `danger` | `#C9775F` | Errores (cálido, nunca rojo neón) |
| `line` / `line-strong` | paper al 10% / 20% | Líneas de 1 px |

El acento se usa con medida: una línea, un número, el botón que confirma algo.
No hay blanco puro, ni morados, ni glow.

## Tipografía

| Rol | Fuente | Utilidad |
|---|---|---|
| Interfaz, datos, controles | Inter Variable (local) | `font-sans` (por defecto) |
| Acentos editoriales, títulos de sección | Instrument Serif + itálica (local) | `font-serif`, `italic` |
| Titulares | Inter ligera, tracking negativo | `text-display`, `text-headline`, `text-title` |
| Etiquetas | Inter 11px, mayúsculas, tracking 0.22em | `eyebrow` |

Los titulares marcan palabras de acento entre asteriscos:
`<RevealHeadline text="Donde una idea *empieza* a tomar forma." />`.

## Espacio, radios y sombras

- `px-gutter`: margen lateral fluido (`clamp(1.25rem, …, 3.5rem)`).
- `max-w-studio`: 88 rem, ancho máximo de contenido.
- Radios clay: `rounded-clay-sm` (14 px, campos), `rounded-clay` (20 px,
  botones), `rounded-clay-lg` (28 px, tarjetas y diálogos). `rounded-xs`/`sm`
  quedan para detalles internos (teclas, marcas).
- Sombras clay, una sola fuente de luz arriba a la izquierda:
  | Utilidad | Uso |
  |---|---|
  | `shadow-clay` | Bloque elevado estándar |
  | `shadow-clay-lift` | Hover de un bloque interactivo |
  | `shadow-clay-panel` | Tarjeta grande o diálogo flotante |
  | `shadow-clay-inset` | Pozo hundido (inputs, lienzos vacíos) |
  | `shadow-clay-pressed` | Botón pulsado (`active:`) |
  | `shadow-clay-solid` | Botón claro (crema o bronce) |

  La receta es siempre la misma: highlight interior superior, sombra interior
  inferior y una sombra difusa exterior. Nunca `glow` de color.

## Dark Claymorphism

El producto se lee como bloques táctiles flotando sobre negro profundo:

1. Fondo `ink-950`; los paneles suben a `ink-900` y nunca superan `ink-700`.
2. Cada bloque lleva borde hairline (`border-paper/[0.06]`) + `shadow-clay`:
   sin el highlight interior la pieza parece recortada, no esculpida.
3. Los campos se hunden (`shadow-clay-inset`), los botones se elevan.
4. El relieve reacciona: hover levanta 2 px, `active` hunde 1 px. El movimiento
   es la prueba de que el bloque es físico.
5. `ClayPanel` (`src/components/ui/clay.tsx`) encapsula todo: `tone`
   (`raised` | `sunken` | `flush`) e `interactive` para superficies clicables.

## Utilidades propias

| Utilidad | Qué hace |
|---|---|
| `eyebrow` | Etiqueta pequeña en mayúsculas con tracking |
| `grain` | Grano de película fijo sobre toda la página (en `<body>`) |
| `scrim` | Viñeta y degradado para texto sobre fotografía |

## Componentes (`src/components/ui`)

| Componente | Variantes / props clave | Notas |
|---|---|---|
| `Button`, `ButtonLink`, `buttonClasses` | `primary`, `accent`, `secondary`, `ghost`, `danger`; `sm`/`md`/`lg`; `loading` | Clay: degradado, highlight interior, `active` hundido. `accent` (bronce) se reserva para "añadir al plan". |
| `ArrowIcon`, `PulseDot` | — | La flecha se desplaza 2 px en hover. |
| `ClayPanel`, `ClayWell` | `tone` (`raised`/`sunken`/`flush`), `interactive` | Superficie clay reutilizable. `ClayWell` es el pozo hundido. |
| `TextField`, `TextArea` | `label`, `hint`, `error`, `aside` | Pozo hundido con `shadow-clay-inset`; error enlazado con `aria-describedby`. |
| `Alert` | `error` (`role="alert"`), `warning`, `info`, `success` (`role="status"`); `action` | Regla lateral fina en lugar de bloque de color. |
| `ProgressBar`, `ProgressRing` | `value` 0..100, `label` | `role="progressbar"` + `aria-valuenow`; se dibujan con Anime.js. |
| `Skeleton`, `SkeletonText`, `LoadingStatus` | — | Conservan el tamaño final: nada salta al llegar los datos. |
| `Modal` | `open`, `onClose`, `title`, `description`, `size` (`md` / `full`) | `<dialog>` nativo con entrada animada. `full` ocupa casi toda la pantalla (el lienzo). |
| `StatusTag`, `SourceTag` | `validated` / `pending` / `open`; `inferred` / `confirmed` / `edited` | La forma del punto también comunica el estado. |

## Conversación (`src/components/workspace`)

| Componente | Notas |
|---|---|
| `ChatBubble` | Marco de burbuja. `from="coach"`: izquierda, `bg-ink-900`, borde `line`, esquina superior izquierda recta. `from="user"`: derecha, `bg-ink-700`, esquina superior derecha recta. Ancho máximo `min(42rem, 85%)`. `meta` bajo la burbuja (hora o estado). |
| `CoachAvatar` | Monograma decorativo: "c" en serif itálica, anillo `bronze/60`, 32 px. |
| `MessageEntry` | Un mensaje real dentro de `ChatBubble`, con cursor bronce mientras llega el stream. |
| `CoachWelcome` | Burbuja de bienvenida con temas en botones-píldora (`rounded-full`, borde `line-strong`, hover bronce). |
| `CopyButton` | Etiqueta pequeña "Copiar" junto a la hora; confirma "Copiado" en una región `aria-live`. |
| `TraceButton` | Enlace subrayado fino "Ver en la conversación". |
| `CanvasDialog` | Lienzo en `Modal size="full"`: bloques separados por líneas de 1 px (`gap-px` sobre fondo `line`). |

| `WorkspaceTour` | Tarjeta de guía con borde `amber/40`; el elemento señalado recibe `data-tour-target` (contorno ámbar en `globals.css`). |
| `IdeaTimeline` | Lista con línea vertical de 1 px y puntos de estado: anillo ámbar = propuesto, `sage` = validado, grafito = mensaje. |
| `DiscardCountdown` (en `proposal-card.tsx`) | Texto tachado, «Deshacer» y una línea ámbar que se vacía en 5 s (transición CSS). |

## Atajos y errores

| Componente | Notas |
|---|---|
| `ShortcutsHelp` | `Modal` con teclas en `<kbd>` grafito y borde `line-strong`. |
| `ErrorState` | Titular editorial, «Reintentar» y «Volver al estudio»; versión con foto en la raíz. |

## Impresión

Al imprimir, todo pasa a tinta `#141414` sobre blanco (texto secundario `#555`),
sin fondos, sombras ni grano. Lo que no va en papel lleva `print:hidden`. Cada
dimensión usa `break-inside-avoid` para no partirse entre páginas.

## Dashboard (`src/components/dashboard`)

| Componente | Notas |
|---|---|
| `IdeaFilters` | Buscador con subrayado y lupa; filtro de estado como píldoras `aria-pressed` con contador (bronce si está activo). |
| `DimensionMarks` (en `idea-entry.tsx`) | Diez barras de 6×12 px: llena `sage` = validada, mitad `amber` = por revisar, contorno = abierta. |

## Navegación (`src/components/navigation`)

- `PublicHeader` — portada y acceso; transparente sobre la foto.
- `AppHeader` — estudio; enlaces con subrayado bronce, menú móvil desplegable.
- `AppShell` — guard de sesión + cabecera.

## Estados interactivos

- Hover: transiciones de 300–500 ms con `--ease-studio`; rellenos suaves, nunca
  brillos.
- Foco: contorno ámbar de 1 px con separación de 3 px (`:focus-visible`).
- Deshabilitado: opacidad 45% y cursor `not-allowed`.
- Ocupado: `aria-busy` + `PulseDot` + texto en gerundio ("Guardando…").

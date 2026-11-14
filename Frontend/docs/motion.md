# Movimiento — Anime.js 4

Anime.js es el **único** motor de animación del cliente. El movimiento sirve a
la narrativa: llegar despacio, asentarse rápido, nunca rebotar, nunca animar
por animar.

## Integración con React

Todo pasa por un único hook: `src/components/motion/use-anime-scope.ts`.

```ts
useAnimeScope(rootRef, (scope) => {
  animate(target, { opacity: [0, 1] });
  return () => {/* limpieza extra opcional */};
}, deps);
```

- Crea un `Scope` de Anime.js con `createScope({ root })` dentro de `useEffect`
  (solo cliente; nunca bloquea el render ni la carga de datos).
- Al desmontar o al cambiar `deps` llama a `scope.revert()`: se cancelan
  animaciones y temporizadores y se retiran los estilos en línea.
- Con `prefers-reduced-motion: reduce` no ejecuta nada.

Vocabulario común en `src/lib/motion.ts`: `EASE.enter` (`outExpo`),
`EASE.drift` (`inOutSine`), `EASE.ui` (`outQuart`) y duraciones.

## Sin parpadeos

`layout.tsx` inyecta un script en línea que, **antes del primer pintado**, pone
`data-motion="on"` en `<html>` si el usuario no pidió reducir movimiento. Solo
entonces el CSS oculta los elementos marcados con `data-enter`, para que la
entrada los revele sin mostrarlos primero.

Salvaguardas:

1. **Failsafe:** una animación CSS revela cualquier `data-enter` a los 3 s,
   aunque un script falle.
2. **Contenido que llega tarde** (datos, sesión) no se marca con `data-enter`:
   usa `Reveal`, que oculta por script y nunca por CSS. Los envoltorios que
   siempre existen llevan la marca y su contenido puede cambiar dentro.
3. Sin JavaScript o con movimiento reducido, nada se oculta nunca.

## Catálogo

| Animación | Dónde | Implementación |
|---|---|---|
| **Entrada cinematográfica** — fondo → foto → navegación → titular por palabras → subtítulo → botones → bloques | Portada, acceso, dashboard, cuenta, workspace | `useCinematicEntrance`: `createTimeline` con pasos superpuestos sobre `[data-enter="backdrop|photo|nav|word|lede|action|block"]` |
| **Titular por palabras** | Todos los titulares principales | `RevealHeadline`: React renderiza cada palabra en una máscara `overflow-hidden`; la línea temporal las eleva con `stagger(65)` |
| **Foto: asentamiento** | Toda fotografía de fondo | Escala 1.08 → 1 y opacidad en 2,2 s |
| **Foto: zoom lento** | Ídem | `scale 1 → 1.06`, 40 s, `loop` + `alternate` |
| **Foto: parallax** | Hero de la portada | `onScroll({ sync: 0.25 })` desplaza la imagen un 14% mientras la sección cruza la pantalla |
| **Revelado al entrar en pantalla** | Secciones de la portada, lista de ideas, estado vacío | `Reveal`: `IntersectionObserver` + `animate(..., { delay: stagger(70) })`; funciona dentro de cualquier contenedor con scroll |
| **Progreso que se dibuja** | Barras del dashboard y del workspace, anillo del plan | `ProgressBar`: `scaleX` desde 0; `ProgressRing`: `svg.createDrawable` + `draw` |
| **Indicador de respuesta** | "Pensando contigo…", "Voy entendiendo…" | Tres líneas con `scaleY` en bucle escalonado; se revierte al desmontar |
| **Nuevas propuestas** | "Lo que hemos identificado" | Cada propuesta recién llegada sube y aparece, escalonada |
| **Dimensión recién validada** | Plan | Destello bronce de 2,4 s en el fondo + scroll suave hasta ella |
| **Mensaje de origen** ("Ver en la conversación") | Conversación | Borde ámbar (`box-shadow`) que se apaga en 2,6 s + scroll al centro; limpia el estilo al terminar |
| **Transición entre secciones** | Todo el estudio | `template.tsx` → `RouteTransition` (fundido + 10 px); limpia el `transform` al terminar para no romper elementos `fixed`. La navegación sigue siendo la del App Router |
| **Modales** | Nueva idea, eliminar cuenta, lienzo, atajos | Subida de 16 px al abrir |
| **Guía del primer acceso** | Workspace | La tarjeta sube y aparece; el contorno del elemento señalado se cierra de 14 px a 4 px |
| **Cuenta atrás de descarte** | Propuestas | Línea que se vacía en 5 s (transición CSS lineal; con movimiento reducido queda estática) |
| **Hover** | Botones, enlaces, portadas de ideas | Transiciones CSS (relleno, flecha +2 px, zoom 1.04 en 1,6 s) |

## Rendimiento

- Solo se anima `opacity`, `transform` y, puntualmente, `background-color`.
- Nada se anima de forma constante salvo el zoom lento de la foto (40 s,
  imperceptible) y el indicador mientras el coach trabaja.
- El texto del coach **no** se anima palabra por palabra: llega del stream y se
  pinta tal cual, para no frenar el chat.
- React Flow (árbol técnico) se carga con `next/dynamic` solo al abrirlo.
- Las imágenes llevan dimensiones fijas por contenedor: sin saltos de diseño.

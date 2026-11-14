# BID — Producto y voz

## Qué es

Un **estudio** para pensar un negocio. La persona conversa con un coach; el
sistema identifica piezas de su idea y se las propone; ella decide qué entra en
su plan. La IA está en la funcionalidad, no en la identidad visual.

## Principios

1. **La IA propone, la persona valida.** Nada entra al plan sin `accept`,
   `correct` o `discard`. Una propuesta (`inferred`) nunca se muestra como si
   fuera parte del plan ni cuenta en el progreso.
2. **El chat es el protagonista.** El plan es el resultado visible; el árbol
   técnico es un detalle opcional, plegado por defecto.
3. **Nada inventado.** Sin estadísticas, testimonios, proyectos de ejemplo ni
   funciones que la API no soporte. Si falta un endpoint, se documenta.
4. **Nunca perder lo escrito.** Si un mensaje no se guarda, el texto vuelve al
   campo; si se guardó (502), no se ofrece reenviarlo.
5. **Un fallo no corta el trabajo.** La extracción, la cuota o el proveedor
   pueden fallar: la conversación sigue.

## Voz

- Español neutro, de **tú**. Cálida, concreta, sin jerga de IA ("modelo",
  "prompt", "token" no aparecen en la interfaz).
- Frases cortas. El coach pregunta; la interfaz acompaña.
- Los mensajes de error dicen **qué pasó y qué pasa con tus datos**:
  "Tu mensaje quedó guardado", "La conversación sigue intacta".
- Los mensajes que redacta la API se muestran tal cual (están escritos para la
  persona). Algunos usan voseo rioplatense ("Podés seguir conversando"); ver
  limitaciones en `docs/arquitectura-cliente.md`.

| Concepto técnico | Cómo lo dice la interfaz |
|---|---|
| `inferred` | Pendiente · "Lo que hemos identificado" |
| `confirmed` | Confirmado |
| `edited` | Escrito por ti |
| `accept` / `correct` / `discard` | "Sí, añadir al plan" / "Corregir" / "Descartar" |
| Extracción en curso | "Voy entendiendo lo que me contaste…" |
| Coach respondiendo | "Pensando contigo…" |
| `completion` | "Plan validado · 40%" |
| `agenda[0]` | "Siguiente: Ingresos" |
| Conversación vacía | Bienvenida del coach: "Puedes empezar por" + tres temas |

## Dirección artística

**BID Creative Studio**: estudio creativo premium, diseño editorial, arquitectura
minimalista, fotografía cinematográfica.

- Negros profundos y grises cálidos; un único acento bronce, usado con medida.
- Titulares grandes en sans ligera con palabras de acento en **serif itálica**.
- Etiquetas pequeñas en mayúsculas con tracking amplio.
- Líneas de 1 px, bordes discretos, composiciones asimétricas, mucho aire.
- Fotografía de montaña, niebla y arquitectura, etalonada oscura y cálida.
- Movimiento lento al llegar, rápido al asentarse; nunca rebote.

**La conversación** usa burbujas (coach a la izquierda con su monograma "c",
persona a la derecha), pero con el lenguaje del estudio: paleta oscura, radios
casi rectos, borde fino, sin degradados ni brillos.

**Prohibido:** robots, cerebros, chispas "mágicas", gradientes morados, glow,
glassmorphism exagerado, avatares ilustrados de "asistente".

Ver [`docs/design-system.md`](docs/design-system.md) y [`docs/motion.md`](docs/motion.md).

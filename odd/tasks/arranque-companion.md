# Arranque companion — post-structuring accompaniment with web-grounded research

Objective: once the ten dimensions are validated, the coach becomes a growth
companion: planning help, concrete advice and web-grounded research (suppliers,
routes, premises), with the "AI proposes, the person validates" rule intact.
Branch: pending — this checkout has no `.git`; create `feat/arranque-companion`
when the repository is git-initialized. Delivery strategy: ask-on-risk.
Test runner: Vitest per package (`pnpm --filter @bid/api test`, single file by
appending a path); DB-gated suites need `TEST_DATABASE_URL` exported; e2e is
Playwright and separate. Baseline at creation: API suite 135 passed | 16
skipped (DB-gated, no container), typecheck green across the three packages.
Authored changed lines: ~2400 final (T1–T9, mock, docs and tests included). No
git in this checkout: work-unit commits are impossible, so each task records
its evidence here instead.

## Specs

S1 — Activation gate: idea complete → arranque. **Shipped (baseline; do not
rebuild).** User, verbatim: "pero lo de "¿quieres empezar otra?" no va, la idea
es qque luego proceda a "arrancar"". Implemented in `provider-coach-model.ts`
(focus else branch) and `rehearsal-coach-model.ts` (complete message), pinned
by `rehearsal-coach-model.test.ts` and `provider-coach-model.test.ts`.

S2 — Real accompaniment (planning + advice). User, verbatim: "luego de
estructurar el proyecto, hay que hacer un acompañamiento real para que siga
creciendo, ayudarle a planificar, consejos". After completion the coach keeps
working with the person: one next step at a time, planning help, concrete
advice. Still one question per turn, still neutral-tú voice, still no invented
facts. Decided shape (D-A): a visible, coach-driven next-step list with sourced
answers; the plan stays closed and read-only — steps never enter it.

S3 — Web-grounded research. User, verbatim: "darle indicaciones, como
consegiur proveedores, rutas, locales, que busque en la web y le de info".
Real-world questions (suppliers, routes, premises) get answers grounded in
Google Search; sources are visible in the chat; nothing sourced enters the
plan without explicit user validation.

S4 — Architecture invariants (how, not what):

- New port(s) live in `application/ports` — the same pattern as `CoachModel`
  and `Extractor`.
- Two implementations per port: `rehearsal` (deterministic, zero network, keeps
  the demo alive without a key or provider) and live.
- The live research uses the existing `@ai-sdk/google`: `google.tools.googleSearch({})`
  in `generateText`/`streamText`, with `sources` and
  `providerMetadata.google.groundingMetadata` (webSearchQueries,
  groundingSupports, searchEntryPoint). Verified against current AI SDK docs;
  T1 confirms against the pinned `@ai-sdk/google@4` + `COACH_MODEL`.
- The post-completion agenda is a pure extension in `packages/core`:
  functions, no infrastructure imports, tested with object literals.
- Research calls count against a visible quota (RF-24 pattern via `UsageQuota`):
  the user is told before the limit, never left wondering.
- PRODUCT.md rule 1 extends to advice: grounded answers live in the chat; the
  plan only changes through the existing proposal flow.

S5 — Voice and honesty. Neutral tú (PRODUCT.md), no voseo; nothing is promised
that is not built (rule 3). The shipped interim pivot already respects this;
the feature must too.

## Decisions

- D-A (resolved 2026-11-19; the user picked "Pasos + fuentes"): the coach
  drives a visible list of next steps, one at a time; answers grounded in web
  search arrive with their sources. The ten-dimension plan stays closed and
  read-only after completion — steps live in the accompaniment, never in the
  plan.
- D-B (technical; resolved by recommendation unless the spike disagrees): use
  Gemini's built-in Google Search grounding through the existing
  `@ai-sdk/google` dependency (no new vendor; citations arrive as `sources`);
  fall back to a dedicated search API only if grounding quality or citation
  rendering disappoints in T1.

## Tasks (planned; none started)

- [x] T1 — Spike: exercise `google.tools.googleSearch` with the pinned
  `@ai-sdk/google` + `COACH_MODEL`; record cost, latency and citation shape in
  this document. (S3, S4) — DONE 2026-11-19 (no commit: no git in this
  checkout): request shape verified live against `@ai-sdk/google@4.0.121` +
  `ai@7.0.173` + `COACH_MODEL` — `tools: [{ googleSearch: {} }]` serialized
  correctly to the `gemini-3.5-flash-lite` endpoint. Response shape NOT
  observed: the live call returned 429 ("You exceeded your current quota") —
  the user's key has no quota available. D-B stands: implement against the
  documented `sources` + `groundingMetadata` shape; the RF-72 fallback owns
  the provider being unavailable, so the feature is not blocked. Live citation
  re-verification pending a key with quota or billing.
- [x] T2 — Core: post-completion agenda (arranque next steps) as pure functions
  + tests. (S2, S4) — DONE 2026-11-19: `packages/core/src/idea/arranque.ts`
  (`ArranqueStep`, `StepStatus`, `openSteps`, `nextStep`: pure, non-mutating,
  oldest-first agenda) + `arranque.test.ts` (5 tests, RED first: module
  absent, then GREEN). Core suite 42/42, core typecheck green.
- [x] T3 — Port: research port in `application/ports`; rehearsal
  implementation (scripted, zero network) + tests. (S3, S4) — DONE 2026-11-19:
  the port is `StepPlanner` (`application/ports/step-planner.ts`, returns raw
  text like the `Extractor`); boundary `step-proposal-schema.ts` (Zod: 1–8
  steps, title ≤160, detail ≤600; tolerant JSON via the shared
  `infrastructure/ai/json.ts` helper — `unwrapJson` extracted from
  `extraction-schema.ts` so both boundaries share one implementation);
  `RehearsalStepPlanner` answers from a generic script that passes the same
  boundary. 8 new tests; extraction regression green after the refactor.
- [x] T4 — Live: grounded implementation behind the port, with the RF-72-style
  fallback behind it + tests. (S3, S4) — DONE 2026-11-19: `GoogleStepPlanner`
  (`EXTRACTOR_MODEL`, temperature 0.2, strict JSON, raw text back);
  `FallbackStepPlanner` in `fallback.ts`; `createStepPlanner` +
  `container.stepPlanner()`; the live coach is now grounded —
  `GoogleCoachModel` passes `tools: { google_search:
  google.tools.googleSearch({}) }` on every call (test pins the recorded
  `google.google_search` tool id) and `buildSystemPrompt` gained the research
  rule ("buscas en la web y citas el enlace"). Full API suite 150 passed |
  16 DB-skipped; root typecheck green.
- [x] T5 — Quota: research calls counted via `UsageQuota`, warning before the
  limit + tests. (S3, S4) — DONE 2026-11-19: the quota lives inside
  `proposeArranqueSteps`, mirroring `extractKnowledge`: checked **before** the
  model is called, consumed after, `quotaReached` surfaced to the caller
  (RF-24). 4 tests, including "quota reached → planner is not called".
- [x] T6 — Coach integration: arranque focus instructions and prompt extension
  for sourced answers + tests. (S2, S3, S5) — DONE 2026-11-19:
  `CoachRequest` gained an optional `nextStep` (D6); `buildProviderMessages`
  now builds the focus through `focusFor` with three states — open dimension,
  next arranque step, pivot into the arranque; `RehearsalCoachModel` asks
  about the step from its script; the system prompt gained the grounded
  answer rule ("buscas en la web y citas el enlace que respalda cada dato").
  Tests pin all three focus states plus the wiring: `chat.test.ts` records
  the `CoachRequest` and asserts `nextStep` reaches the model.
- [x] T7 — API: accompaniment endpoints for the step list (per-idea step
  state: list, advance, complete) and research answers carrying sources; Zod
  schemas, owner-scoped, tests. Exact routes follow T2's core model. (S2, S3)
  — DONE 2026-11-19: port `ArranqueStepRepository` + Drizzle and in-memory
  implementations; additive migration `0002_curious_husk.sql` (`step_status`
  enum, `arranque_steps` table with cascade FK and idea+created index — zero
  changes to existing tables); use cases `load-arranque-steps`,
  `add-arranque-steps`, `update-arranque-step-status` (owner-scoped;
  `StepNotFoundError` → honest 404); body schemas `addStepsSchema` /
  `stepStatusSchema`; routes `GET|POST /:id/steps`,
  `POST /:id/steps/proposals`, `PATCH /:id/steps/:stepId`; container wiring;
  `sendMessage` loads the next open step when the agenda is empty. API suite
  162 passed | 18 DB-skipped (2 new gated tests await a live Postgres); root
  typecheck green.
- T8 — Frontend: the step-list surface in the workspace and citation rendering
  in the chat + tests. (D-A, S5)
- [x] T8 — Frontend: the step-list surface in the workspace and citation rendering
  in the chat + tests. (D-A, S5) — DONE 2026-11-19 (delegated bounded writer,
  parent-reviewed): `Frontend/src/lib/api.ts` (`PATCH` added to the request
  union, purely additive) with four transport methods + 6 tests;
  `use-arranque-steps.ts` (persist-only-on-accept, quota as a notice not an
  error, 404-step reloads the truth); `arranque-panel.tsx` + 12 behavior
  tests; `rich-text.tsx` gained the linkify layer (URLs in coach messages
  render as `noreferrer noopener` links) wired through the existing chat
  renderer (`message-entry.tsx`); `workspace-view.tsx` mounts
  `ArranqueSection` at `percent === 100`, mirroring the S1 gate client-side.
  RED and GREEN observed: 19 files / 118 tests (95 pre-existing unchanged);
  typecheck and lint green. Parent spot check: hook product rule, RichText
  wiring, quota variant, PATCH additive, the 100% gate.
- [x] T9 — Mock parity, docs sync (PRODUCT.md, arquitectura, HANDOVER), full
  verification. (S1–S5) — DONE 2026-11-19: mock parity live-verified (L7);
  docs synced — `arquitectura.md` §8 now lists manual authoring, idea CRUD,
  versions and the arranque, and its "deliberadamente no implementado" list
  dropped the two stale entries (history/diff and provider-configured are
  shipped; the script remains as the RF-72 fallback); test counts honest
  (322 green, 18 DB-skipped); `Frontend/README.md` test count 73 → 118;
  `PRODUCT.md` gained the arranque and quota concept rows. Full seam check
  green: typecheck ×3, core 42/42, API 162 passed | 18 skipped, Frontend
  118/118.

- [x] T10 — El acompañamiento no avanza: el chat se quedaba estancado en el
  mismo paso. (S2, S5) — DONE: reproducido con un test (dos turnos sobre la
  misma idea completa devolvían la MISMA respuesta literal). Causa: el turno
  del arranque era una función pura del estado y nada lo movía desde el chat —
  sólo el PATCH del panel cerraba un paso, así que la pregunta se repetía para
  siempre. Arreglo en tres piezas: (1) `stepAlreadyRaised` en
  `application/ports/coach-model.ts` (el último mensaje es el turno que se
  responde, así que sólo cuentan los anteriores al `createdAt` del paso);
  (2) `RehearsalCoachModel` y `focusFor` (live) tienen dos estados sobre el
  mismo paso — la primera vez preguntan, después trabajan el paso con el
  `detail` de la propuesta, dan un consejo concreto y dicen cómo se cierra;
  `buildSystemPrompt` ganó la regla del arranque; (3) el estado de los pasos
  subió a `workspace-view` (`useArranqueSteps` con `enabled`), y
  `ArranqueStrip` —encima del composer— muestra el paso en curso con "Ya lo
  hice" (PATCH) y, sin pasos, "Pedir pasos al coach" + salto al panel.
  `mock/server.mjs` refleja la misma regla de dos estados. Tests: API 165
  passed | 18 DB-skipped (3 nuevos: 2 de coach, 1 de integración en
  `chat.test.ts`); Frontend 122/122 (4 nuevos en `arranque-strip.test.tsx`).
  typecheck ×3 y lint verdes.

- [x] T11 — El coach vivo no llegaba al modelo: caía siempre al guion. (S3, S5)
  — DONE: verificado en el stack real (`COACH_PROVIDER=live`), tres turnos
  seguidos sobre una idea nueva devolvían la MISMA pregunta literal. En el log,
  cada turno del coach terminaba en `AI_APICallError 429 RESOURCE_EXHAUSTED`
  sobre `gemini-3.5-flash-lite:streamGenerateContent`, mientras el planner y el
  extractor —mismo modelo, sin la herramienta de búsqueda— respondían bien: la
  cuota que se agota es la de **grounding**, que tiene su propio cupo. El
  `FallbackCoachModel` (RF-72) tapaba el fallo y contestaba con el guion, así
  que el chat no conversaba: sólo recitaba la próxima dimensión abierta y la
  repetía hasta que se aceptara un nodo. Arreglo: `GoogleCoachModel` reintenta
  **una vez sin la herramienta** cuando la llamada grounded falla antes de
  emitir texto (se pierden las fuentes, no la respuesta); si ya había texto, el
  error se propaga como antes. Test nuevo con `MockLanguageModelV4` (primer
  call falla, segundo sin `google_search` y responde). API 166 passed | 18
  DB-skipped; `tsc` verde. El grounding sigue necesitando cuota: eso es
  billing/clave, no código.

- [x] T12 — Búsqueda propia sin depender del grounding de Google (D-B). (S3, S4)
  Decidido 2026-11-19 tras comprobar que `Grounding with Google Search` exige
  tier pago (429 en cada llamada). Alcance: (1) puerto `WebSearch` en
  `apps/api/src/application/ports/web-search.ts` con
  `SearchResult { title, url, snippet }` y `search(query)`; (2)
  `TavilyWebSearch` en `apps/api/src/infrastructure/ai/tavily-web-search.ts`
  (POST `https://api.tavily.com/search`, `api_key` desde `TAVILY_API_KEY`,
  `max_results: 5`, descarta resultados sin `url`, lanza en non-2xx, `fetch`
  inyectable para los tests); (3) `GoogleCoachModel` acepta `webSearch`
  opcional: si existe registra la tool `web_search` (execute devuelve una lista
  `título — url — fragmento`) y usa `stopWhen: stepCountIs(3)`; si no existe,
  sigue con `google_search` como hoy, y el reintento "una vez sin tools" cubre
  ambos casos; (4) `createWebSearch()` en `infrastructure/ai/index.ts`
  devuelve la implementación sólo si `TAVILY_API_KEY` está definida y
  `createCoachModel` la pasa. Tests: Tavily (ok con fetch inyectado, non-2xx,
  sin url, tope 5) y coach (con `webSearch` la tool registrada es `web_search`;
  sin ella sigue `google_search`). Sin tocar `.env*`; la variable se documenta
  acá.

  DONE 2026-11-19: entregado por el writer delegado tal como estaba especificado
  (`WebSearch`, `TavilyWebSearch`, `createWebSearch`, tool `web_search`,
  `stopWhen`), más dos remates del padre tras la verificación en vivo: (a) la
  ejecución de la tool ahora vive en `web-search-tool.ts` y **no lanza** — si
  Tavily falla devuelve una instrucción honesta (buscar podía tumbar el turno
  entero: el stream cerraba sin texto, `FallbackCoachModel` contestaba con el
  guion y la persona volvía a leer la misma frase); (b) un intento que termina
  **sin una sola palabra** cuenta como intento fallido y se reintenta sin
  herramienta, igual que un error. Además `createWebSearch()` avisa por consola
  qué backend de búsqueda usa el coach: sin esa línea el 429 del grounding pasó
  un día entero pareciendo un problema del modelo. También se estabilizaron los
  dobles de test: `application/testing/clock.ts` da timestamps monótonos a los
  repositorios in-memory (con `new Date()` el paso y el primer mensaje caían en
  el mismo milisegundo y `stepAlreadyRaised` respondía mal en la mitad de las
  corridas — flake real, no del código de producción: Postgres guarda
  microsegundos). Verificado en vivo con la key del usuario: el coach busca y
  cita (`caferosario.com.ar`, `origencafe.com.ar` + su guía de precios, los tres
  responden 200) y ya no cae al guion. API 175 passed | 18 DB-skipped; core
  42/42; Frontend 122/122; typecheck ×3 y lint verdes.


## Automático vs manual (quién hace qué)

Regla de oro del producto: **el coach propone, la persona valida**. Nadie marca
un paso como hecho por vos, y nada entra al plan sin tu decisión.

Lo hace el sistema, solo:

1. Calcular la próxima dimensión abierta (`findGaps`, determinístico — nunca la IA).
2. Preguntar **una** cosa por turno sobre esa dimensión o sobre el paso en curso.
3. Leer tu respuesta y proponer nodos candidatos (extractor; si la salida no pasa
   el esquema Zod se descarta entera, nunca a medias).
4. Proponer los primeros pasos del arranque cuando el plan ya está completo.
5. Buscar en la web y citar el enlace cuando la respuesta necesita datos reales
   (proveedores, rutas, locales, precios).
6. Guardar tu mensaje **antes** de llamar al modelo, y la respuesta cuando termina.
7. Cambiar de tema solo: cuando un nodo o un paso cambia de estado, el foco del
   coach se mueve. Si nada cambia, sigue en el mismo punto (nunca inventa avance).

Lo hacés vos, a mano:

1. Escribir la respuesta. El coach no rellena lo que no dijiste.
2. **Aceptar, corregir o descartar** cada nodo propuesto. Rechazarlo no deja nada.
3. Pedir los pasos del arranque y **elegir cuáles quedan** en la lista.
4. **Marcar el paso como hecho** («Ya lo hice» arriba del chat o «Marcar como
   hecho» en El arranque). Es el único gesto que mueve al coach al paso siguiente.
5. Reabrir un paso si lo cerraste por error.

En la UI, esa regla se dice una vez donde aplica: mientras haya pasos abiertos y
ninguno hecho, «El arranque» muestra «Los pasos los cierras tú: el coach no
avanza al siguiente hasta que marques uno como hecho». El aviso desaparece solo
cuando el primer paso se cierra (no hay flag que guardar).

Consecuencia práctica: el acompañamiento **no avanza solo**. Si no marcás el
paso, el coach sigue trabajando ese paso — y eso es a propósito (D-A).

Routes (inline vs delegated) are decided per task at implementation; commit
identities are recorded here as each task lands.

## Log

- L1 (2026-11-19), user direction, verbatim: "Bueno, a parte, luego de
  estructurar el proyecto, hay que hacer un acompañamiento real para que siga
  creciendo, ayudarle a planificar, consejos, por ejemplo, darle indicaciones,
  como consegiur proveedores, rutas, locales, que busque en la web y le de
  info, etc"
- L2 (2026-11-19), register decision, verbatim: "el acento argentino no va, el
  resto me parece bien" → product voice is neutral tú; coach prompt, rehearsal
  script and focus instructions unified and test-pinned.
- L3 (2026-11-19), flow correction, verbatim: "pero lo de "¿quieres empezar
  otra?" no va, la idea es qque luego proceda a "arrancar"" → activation gate
  shipped the same day: `provider-coach-model.ts`, `rehearsal-coach-model.ts`
  and two new test files; API suite 135 green | 16 DB-skipped; typecheck green.
- L4 (2026-11-19), "Dale pue" → this feature document created; implementation
  not started; D-A pending the user's answer.
- L5 (2026-11-19), D-A resolved: the user picked "Pasos + fuentes
  (Recomendado)" → the coach drives a visible next-step list with sourced
  answers; the plan stays read-only after completion; T7/T8 specs made
  concrete.
- L6 (2026-11-19), T1 spike outcome: `googleSearch` grounding serializes
  correctly with the pinned SDK (`tools: [{ googleSearch: {} }]` reached the
  model), but the live call returned 429 — the `GOOGLE_GENERATIVE_AI_API_KEY`
  has no quota available. Implementation proceeds (rehearsal + unit tests
  cover everything; the fallback owns provider failures); live citations need
  a key with quota or billing enabled.
- L7 (2026-11-19), T9 mock parity done inline while T8 (Frontend) runs as a
  delegated bounded writer with a disjoint surface: `mock/server.mjs` gained
  the four step routes, seeded demo steps for the completed idea, and PATCH
  in its CORS allow-methods (previously missing — the mock never had PATCH
  support). Live-verified: GET 200, POST 201, proposals 200, PATCH 200,
  missing step 404.
- L8 (2026-11-19), T8 returned green from the delegated writer and the parent
  closed the feature: seam check green (typecheck ×3, core 42/42, API
  162 passed | 18 DB-skipped, Frontend 118/118 — 95 pre-existing unchanged).
  `gentle-ai review assess` is UNASSESSABLE in this checkout (no `.git`: the
  candidate cannot be bounded; 0 changed paths). The typed result is
  preserved as-is — no tier lowering, no invented PASS; verification stands on
  writer self-verification plus parent spot checks (hook product rule,
  RichText wiring, quota variant, PATCH additive, the 100% gate). Enabling
  git (`git init` + a commit) is the prerequisite for the native review
  receipt; the RDD switch is on (global).
- L9 (2026-11-19), discoverability fix after user report ("always the same
  answer once the 10 questions end" — seen outside the user's PC, likely by a
  teammate): with a complete idea and NO accepted steps, every chat turn
  repeated the generic pivot and nothing said WHERE steps come from. Three
  surfaces fixed with RED first: (1) `rehearsal-coach-model.ts` complete
  message now guides to the panel («El arranque» — pide los pasos, aceptá los
  que te sirvan); (2) `provider-coach-model.ts` focusFor (no agenda, no step)
  instructs the live coach to guide to the proposal mechanism; (3) the mock's
  `COACH_REPLY` became arranque-aware — it works the next open step when one
  exists and otherwise gives the guided pivot (previously it answered the
  same generic line forever). Verified: API suite 162 passed | 18 skipped,
  typecheck green, and both mock branches live-verified via curl (complete +
  open step → «Vamos con el paso que sigue…»; complete + zero steps → the
  guided pivot). Note discovered while verifying: the mock's demo idea ships
  with THREE open dimensions on purpose (so the structuring conversation can
  be demoed) while the real seed's demo idea is complete — on the real stack
  the demo account goes straight to the arranque panel with zero steps and
  the "Pedir pasos al coach" CTA.

- L10 (2026-11-19), reporte del usuario, verbatim: "lo que pasa es que el flujo
  de trabajo del chat no esta funcionando revusalo y dime si el problema es hay
  o en otra parte cuando llega de al punto del acompananmiento en los consejos
  se queda estancado en ese punto ya savez buscado donde es y soluciona" →
  reproducido: `sendMessage` sobre una idea completa con un paso abierto
  devolvía la misma respuesta en cada turno. El problema no estaba en el
  transporte: era el bucle del arranque, que no tenía forma de cerrar un paso
  desde la conversación. Arreglo en T10; mock y docs alineados.

- L11 (2026-11-19), corrí el stack real a pedido del usuario y apareció la
  causa de fondo del "pregunta lo mismo": el coach vivo recibía 429 en la
  llamada con grounding y el fallback contestaba con el guion, que depende
  sólo de la lista de gaps. Tres turnos seguidos = misma frase, palabra por
  palabra. Arreglo en T11 (reintento sin la herramienta). Verificado en vivo:
  los mismos tres turnos ahora responden a lo que la persona escribió.

- L12 (2026-11-19), el usuario puso `TAVILY_API_KEY` en `.env.local` →
  verificación en vivo del stack: `[coach] búsqueda web propia activa (Tavily)`
  en el arranque de la API y respuestas con enlaces reales. La primera corrida
  falló a medias ("The provider ended without an answer"): la tool que lanzaba
  dejaba el stream vacío y el fallback contestaba con el guion. Remates (a) y
  (b) de T12.

- L13 (2026-11-19), reporte del usuario, verbatim: "pero cuando le doy pedir
  pasos la choach en el chat que tenia no funciona" → causa real: el botón del
  strip llamaba `showPane("plan")`, y en pantallas menores a `lg` el panel de
  conversación se oculta entero (`pane === "conversation" ? "flex" : "hidden
  lg:flex"`), composer incluido: pedir pasos parecía matar el chat. Arreglo: el
  strip ya no cambia de panel por su cuenta — las propuestas se renderean **en
  el chat** (Añadir / Descartar) y «Ver el arranque» sigue ahí, pero sólo
  cuando la persona lo pide. Tests: 2 nuevos en `arranque-strip.test.tsx`
  (pedir no cambia de panel; aceptar desde el chat guarda el paso y el strip
  pasa a «Paso en curso»). Frontend 123/123, tsc y lint verdes. Verificado en
  vivo que el chat sigue respondiendo después de pedir pasos.

- L14 (2026-11-19), el usuario cierra L13, verbatim: "para si funciona error
  mio". Confirmado por los datos: su idea tenía 5 pasos y 2 ya marcados como
  hechos, es decir los clicks sí llegaban. Quedan dos mejoras de esa ronda:
  «Ver el arranque» ahora hace scroll a la sección (antes, en pantalla ancha,
  cambiar de panel no producía nada visible) y la API loguea una línea por
  request en desarrollo, para distinguir un botón muerto de un request que
  nunca salió del navegador.

- L15 (2026-11-19), reporte del usuario, verbatim: "lo qui es un eerror del
  fronted con el scrool de la pagina que puedes bajar y que da todo en negro" →
  el workspace fijaba su alto con `h-[calc(100dvh-4rem)]`, restando un header de
  4rem a ojo, dentro de un shell con `min-h-dvh`: cuando el header no medía
  exactamente 4rem (ventana angosta, nav que envuelve, tabs de mobile) el
  documento crecía y se podía scrollear más allá del contenido, a un vacío del
  color de fondo (casi negro). Arreglo estructural: el shell pasa a
  `h-dvh overflow-hidden` con `#contenido` como único contenedor de scroll y el
  workspace a `h-full` — nadie adivina la altura del header, la resuelve el
  layout. Frontend 123/123, tsc y lint verdes. Pendiente de confirmación
  visual del usuario (no hay test que cubra layout).

- L16 (2026-11-19), corrección del usuario sobre L15, verbatim: "no dejalo como
  antes lo que tenias que hacer era quitar el escrool externo y dejar los dos
  que estaban" → el scroll de la página se va del shell y queda sólo donde
  corresponde: `#contenido` ya no scrollea; el workspace usa los dos paneles que
  ya tenía (conversación y plan) y el dashboard/cuenta scrollean en su propio
  contenedor. Mismo aspecto que antes, sin scroll externo.
- L17 (2026-11-19), mismo mensaje: "el paso de crear canales digitales se está
  demorando … parece que está haciendo una página". Medido en vivo: turno sin
  búsqueda 3.1 s, turno con búsqueda 9.7 s (buscó Carrd/Shopify con precios y
  enlaces; 0 errores 429). No construye ninguna página: busca datos reales. Pero
  hay un defecto real de percepción: `sendMessage` **acumula la respuesta
  completa** (`streamToText`) y recién después la re-emite palabra por palabra
  (24 ms), así que los ~10 s son de silencio total antes de la primera palabra.
  Propuesta pendiente de aprobación: pasar el stream del modelo tal cual al
  cliente y guardar el mensaje al terminar (cambia el caso de uso central
  `sendMessage`, por eso no se hizo sin permiso).

- L18 (2026-11-19), aprobado el streaming y corregido el scroll según el
  usuario: "deja el scroll del chat y del plan como estaba antes por separado".
  Scroll: el workspace pasa a `flex min-h-0 flex-1` (llenar el alto por flex, no
  por un `h-full` que no resolvía) dentro de un shell de alto definido: los dos
  paneles conservan su scroll propio e independiente y la página no scrollea.
  Streaming: `sendMessage` deja de bufferear — jala el primer chunk (así un
  fallo inmediato sigue siendo un 502 honesto) y el resto pasa al navegador tal
  cual, guardando el mensaje del coach una sola vez al terminar. Medido en vivo
  con búsqueda: primer byte **1,0 s** (antes 9,7 s de silencio) y total 1,5 s.
  Tests: 1 nuevo ("sends the answer while the model is still writing it") y los
  de conversación consumen el stream como lo hace la ruta. API 176 passed | 18
  DB-skipped; Frontend 123/123; typecheck ×3 y lint verdes.

- L19 (2026-11-19), pedido del usuario, verbatim: "quita los cambios que hicistes
  al scrool y dejalo como antes y ademas lo del chocach creo que eran pasos que
  debias hacer tu manual seria bueno saber que que pasos hace eso automatico y
  cuales debes hacer tu y marcar como echos" → revertidos los cuatro cambios de
  scroll (`app-shell`, `workspace-view`, `studio-view`, `profile/page`) al estado
  original; queda documentado en «Automático vs manual» quién hace qué.

- L20 (2026-11-19), aprobado por el usuario ("si") → el aviso «Los pasos los
  cierras tú…» vive en «El arranque» mientras ningún paso esté hecho. 2 tests
  nuevos en `arranque-panel.test.tsx`; Frontend 125/125, tsc y lint verdes.

- L21 (2026-11-19), reporte del usuario, verbatim: "cuando la conversacion se
  alarga la pantalla se comienza a salir, es decir la barra de la derecha para
  subir y bajar se va de largo, y aparece un espacio en negro abajo" → el grid de
  los dos paneles no tenía la fila acotada: su altura la dictaba el contenido, así
  que una conversación larga estiraba el workspace más allá del alto fijo y el
  documento volvía a scrollear hacia un vacío del color de fondo. Arreglo puntual
  (sin tocar el shell, como pidió el usuario): `grid-rows-[minmax(0,1fr)]` en el
  contenedor de los dos paneles — la fila la define la pantalla, no el contenido;
  cada panel sigue scrolleando adentro suyo. Frontend 125/125, tsc y lint verdes.
  Si el alto del header no fuera exactamente 4rem quedaría un resto del mismo
  problema (el `calc(100dvh-4rem)`), que es lo que arreglaba el cambio revertido.

- L22 (2026-11-19), pedido del usuario, verbatim: "en la estrucutura tecnica,
  me deberia dejar ampliarlo" → el diagrama de jerarquía vivía en un caja fija de
  26rem dentro del panel del plan: con diez dimensiones no se lee. `StructureTree`
  acepta ahora `heightClassName` y «Ver estructura técnica» gana un botón
  **Ampliar** que lo abre a pantalla completa en el `Modal` (size `full`,
  `h-[calc(100dvh-14rem)]`). El botón vive fuera del encabezado colapsable para
  no anidar botones. Test nuevo `plan-panel.test.tsx` (abre el diálogo y el
  diagrama pasa del alto del panel al de la pantalla); jsdom no implementa
  `showModal`, se stubea localmente en ese test. Frontend 126/126, tsc y lint
  verdes.

- L23 (2026-11-19), diagnóstico externo aportado por el usuario y verificado
  acá: la franja negra no venía del alto de los paneles sino de los `span.sr-only`
  de cada mensaje —`position: absolute` sin ancestro posicionado, así que su
  containing block quedaba por encima del scroller y `overflow` no los recortaba:
  cada label estiraba el documento. Fix de una palabra: `relative` en el
  `<article>` de `ChatBubble` (`message-entry.tsx`). Verificado con un e2e nuevo
  (`Frontend/e2e/layout.spec.ts`, «the workspace never scrolls the document»),
  medido en el navegador real: **sin** el fix `scrollHeight - innerHeight = 861`,
  **con** el fix `≤ 1`. Ese e2e es el guard de regresión. Además se revirtió mi
  cambio anterior de `grid-rows-[minmax(0,1fr)]` en el workspace: era un parche
  al síntoma y ya no hace falta. Regla general que queda anotada: todo contenedor
  con scroll que tenga descendientes `position: absolute` necesita un ancestro
  posicionado dentro del scroller.

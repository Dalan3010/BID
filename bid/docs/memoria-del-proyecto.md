# Memoria del proyecto (Engram)

Registro de las decisiones y descubrimientos guardados durante el diseño y la
construcción del cimiento. Es una **instantánea** exportada desde Engram, el
sistema de memoria persistente usado durante el desarrollo.

La fuente de verdad es Engram, no este archivo. Si hay divergencia, manda
Engram.

## Cómo cargarla en otra máquina

El archivo [`engram/bid-export.json`](./engram/bid-export.json) es un export
nativo de Engram, listo para importar:

```bash
engram import docs/engram/bid-export.json
```

Eso restaura las 6 entradas y la sesión bajo el proyecto `bid`. Verificado con
`engram` v3.6.0: importa 6 observaciones sin errores.

> El export **no incluye los prompts** de la conversación original. Se quitaron
> a propósito: no hacen falta para restaurar las decisiones y contienen el
> intercambio personal del desarrollo.

## Cómo consultarla

```bash
# Buscar dentro del proyecto
engram search "canonical" --project bid

# Ver el contexto cronológico alrededor de una entrada
engram timeline <ID> --project bid
```

Desde un agente con acceso a Engram (por ejemplo, Gentle AI):

```
mem_search(project: "bid", query: "canonical")
mem_get_observation(id: <ID>, project: "bid")
```

> **Sobre los IDs:** los números de esta página (`#249`, `#250`, …) son los del
> store original donde se escribieron. Al importar el JSON, Engram asigna IDs
> nuevos. Para ubicar una entrada usá el **tema** (`topic_key`), que sí es
> estable, o buscá por título.

> **Sobre el proyecto:** se llama `bid`, igual que el repositorio. Engram lo
> detecta desde el remote de GitHub, así que dentro del directorio del repo no
> hace falta pasar `--project`.

## Índice

| ID | Tipo | Tema | Fecha |
|---|---|---|---|
| [#249](#249) | architecture | `architecture/canonical-model` | 2026-11-01 17:53 |
| [#250](#250) | decision | `product/node-edit-permissions` | 2026-11-01 17:53 |
| [#251](#251) | decision | `product/demo-mode` | 2026-11-01 18:12 |
| [#252](#252) | decision | `architecture/stack` | 2026-11-01 18:12 |
| [#253](#253) | architecture | `project/bid-foundation` | 2026-11-01 18:40 |
| [#254](#254) | decision | `architecture/stack-rationale` | 2026-11-01 19:06 |

---

<a id="249"></a>
## #249 — Modelo canónico con proyecciones por metodología

**Tipo:** architecture · **Tema:** `architecture/canonical-model` · **Fecha:** 2026-11-01 17:53

**Qué:** Se definió la arquitectura central del coach de ideas como un único
grafo canónico (`problem`, `segment`, `value_proposition`, `solution`,
`channels`, `revenue`, `costs`, `competition`, `metrics`, `risks`) con cada
metodología (Lean Canvas, BMC, árbol, card) como una proyección pura sobre él.

**Por qué:** El usuario quiere una experiencia conversacional natural donde la IA
estructure la metodología de forma invisible, y quiere interpolación entre
múltiples metodologías.

**Dónde:** `docs/especificacion-funcional.md`, secciones 3–4.

**Aprendido:** Las proyecciones como funciones hacen que agregar una metodología
sea un mapeo, no una migración, y dan a todas las vistas el mismo historial
gratis. Regla dura adoptada: la IA propone nodos como `inferred`, nunca escribe
directo en la fuente de verdad.

---

<a id="250"></a>
## #250 — Permisos de edición: solo nodos confirmados

**Tipo:** decision · **Tema:** `product/node-edit-permissions` · **Fecha:** 2026-11-01 17:53

**Qué:** Los usuarios pueden editar directamente nodos del grafo solo cuando su
`source` es `confirmed`; los nodos `inferred` se corrigen conversando. La
jerarquía de merge es `edited` > `confirmed` > `inferred`.

**Por qué:** Equilibra la sensación de propiedad del usuario sobre el árbol con
el riesgo de que una re-extracción automática pise correcciones humanas.

**Dónde:** `docs/especificacion-funcional.md` D2, D3, RF-32, RF-33.

**Aprendido:** El flag `source` de cada nodo también habilita trazabilidad
(nodo → mensaje que lo originó) y detección de huecos, así que un solo campo
sirve para confianza, historial y coaching.

---

<a id="251"></a>
## #251 — El modo demo pasó a prioridad alta

**Tipo:** decision · **Tema:** `product/demo-mode` · **Fecha:** 2026-11-01 18:12

**Qué:** Se agregó el Módulo H (RF-70..RF-74) a la especificación: cuenta demo
con datos sembrados, recorrido guionado de 90 segundos, fallback sin IA con
streaming simulado, botón de reset y precalentamiento.

**Por qué:** La evaluación universitaria es una demo en vivo, así que una caída
del proveedor de IA o una cuota agotada es un riesgo de entrega, no un bug
menor.

**Dónde:** `docs/especificacion-funcional.md` Módulo H, RNF-15..17, decisión L6.

**Aprendido:** Construir el camino de la demo al revés — modelo de datos y
vistas sembradas primero, IA al final — para que una integración tardía de IA no
deje el proyecto sin nada que mostrar.

---

<a id="252"></a>
## #252 — Cambio de npm a pnpm

**Tipo:** decision · **Tema:** `architecture/stack` · **Fecha:** 2026-11-01 18:12

**Qué:** Se reemplazó `package-lock.json` por `pnpm-lock.yaml`, se agregó
`packageManager: pnpm@11.21.0` en `package.json` y se documentó pnpm en el
README.

**Por qué:** El usuario eligió pnpm para el proyecto universitario.

**Dónde:** `package.json`, `pnpm-lock.yaml`, `README.md`, commit `1986680`.

**Aprendido:** Node 26 ya no incluye corepack, así que el campo `packageManager`
no instala pnpm automáticamente: hay que correr `npm install -g pnpm` una vez.
El zip de entrega se verificó de punta a punta extrayéndolo en un directorio
limpio y corriendo `pnpm install --frozen-lockfile`, typecheck, tests y build.

---

<a id="253"></a>
## #253 — Cimiento del proyecto con modelo canónico y proyecciones puras

**Tipo:** architecture · **Tema:** `project/bid-foundation` · **Fecha:** 2026-11-01 18:40

**Qué:** Se construyó el cimiento: scaffold de Next.js 16.4.3 + TypeScript +
Tailwind 4, estructura hexagonal
(`app` / `application` / `domain` / `infrastructure`), modelo canónico de idea
(10 tipos de nodo, `NodeSource` `inferred`/`confirmed`/`edited`) y tres
proyecciones puras (`findGaps`, `completionRatio`, `buildTree`) con 9 tests de
Vitest pasando.

**Por qué:** El usuario pidió solo arquitectura y patrón de diseño, no el
proyecto completo, para que un profesor pueda revisarlo.

**Dónde:** `src/domain/idea/`, `docs/arquitectura.md`,
`docs/especificacion-funcional.md`, `README.md`.

**Aprendido:** El scaffold de Next 16 usa tipos `LayoutProps` generados que
rompen `tsc --noEmit` en un clon limpio; el layout se escribió con props
explícitas de React. También se descartó `next/font` para que el build no
dependa de la red.

---

<a id="254"></a>
## #254 — Se mantuvo Next.js tras cuestionarlo explícitamente

**Tipo:** decision · **Tema:** `architecture/stack-rationale` · **Fecha:** 2026-11-01 19:06

**Qué:** El usuario reafirmó Next.js después de que se le presentara la
alternativa Vite + React + Hono.

**Por qué:** Los beneficios de Next.js (SSR, SEO, RSC, optimización de imágenes)
no aplican a esta app completamente autenticada, y su frontera server/client
agrega complejidad de defensa; aun así, el usuario decidió mantener Next.js de
forma deliberada.

**Dónde:** `docs/especificacion-funcional.md` D5 y decisión L7.

**Aprendido:** El core del Vercel AI SDK es agnóstico de framework, así que el
streaming no es un argumento exclusivo de Next.js — esa justificación inicial se
debilitó y se corrigió. Consecuencia aceptada: evitar el uso profundo de Server
Components y del caché implícito, y estar listo para justificar la elección en la
defensa oral.

> Esta entrada se restauró después de haber sido sobrescrita por la decisión de
> pnpm, que compartía la clave de tema `architecture/stack`.

---

## Datos de la sesión

- **Proyecto:** `bid`
- **Sesión:** `ses_e66c569aaffeliAXX3OcXuJU67`
- **Total de entradas exportadas:** 6

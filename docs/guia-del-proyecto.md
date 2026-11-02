# Guía del proyecto

Todo lo necesario para entender, ejecutar y continuar este repositorio sin
contexto previo.

---

## 1. Qué es

**BID** es una aplicación web que funciona como **coach** para ayudar a un
emprendedor a cimentar e iniciar su idea de negocio.

El usuario conversa en lenguaje natural. El sistema extrae estructura de esa
conversación y la proyecta en visualizaciones (árbol, card, canvas) que muestran
qué tan sólida está la idea y qué falta.

La idea central: **el valor no está en la conversación, está en que el sistema
recuerde, ordene y devuelva un plan.**

---

## 2. Estado actual

Este repositorio contiene el **cimiento**: el modelo de dominio, el patrón de
diseño y la documentación. No es una aplicación funcional todavía.

### Implementado

| Elemento | Dónde |
|---|---|
| Scaffold de Next.js 16 + TypeScript + Tailwind 4 | `src/app/` |
| Modelo canónico de una idea (10 dimensiones) | `src/domain/idea/types.ts` |
| Proyecciones puras: huecos, completitud, árbol | `src/domain/idea/projections/` |
| 9 tests unitarios de las proyecciones | `*.test.ts` |
| Especificación funcional completa | `docs/especificacion-funcional.md` |
| Documento de arquitectura | `docs/arquitectura.md` |

### Deliberadamente no implementado

- Base de datos y persistencia
- Autenticación (registro, login, sesión)
- Integración con proveedor de IA
- Rutas de la aplicación y componentes de UI
- Seed de datos para la demo

El orden en que se construirán está en la sección 9.

---

## 3. Requisitos previos

| Herramienta | Versión | Nota |
|---|---|---|
| Node.js | 20 o superior | Probado con Node 26 |
| pnpm | 11.x | **No viene con Node** |

Node ya no incluye corepack, así que pnpm se instala aparte:

```bash
npm install -g pnpm
```

---

## 4. Cómo ejecutarlo

```bash
unzip bid.zip
cd bid

pnpm install
pnpm dev          # http://localhost:3000
```

> **No uses `npm install` en este repositorio.** El lockfile es
> `pnpm-lock.yaml`. npm lo ignora, genera un árbol de dependencias distinto y
> rompe la reproducibilidad.

### Scripts disponibles

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo con recarga |
| `pnpm build` | Build de producción |
| `pnpm start` | Servir el build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm test` | Tests una vez |
| `pnpm test:watch` | Tests en modo watch |

---

## 5. Qué hay dentro

```
bid/
├── .env.example              Plantilla de variables de entorno (sin secretos)
├── .gitignore                Excluye node_modules, .next, .env.local, artefactos
├── README.md                 Resumen y puesta en marcha
├── package.json              Dependencias y scripts
├── pnpm-lock.yaml            Lockfile (no editar a mano)
├── tsconfig.json             TypeScript estricto, alias @/* → src/*
├── next.config.ts            Configuración de Next.js
├── eslint.config.mjs         Reglas de lint
├── docs/
│   ├── especificacion-funcional.md   Requisitos, decisiones de producto, alcance
│   ├── arquitectura.md               Capas, patrón de diseño, convenciones
│   ├── memoria-del-proyecto.md       Decisiones exportadas desde Engram
│   ├── engram/                       Export nativo + instrucciones de import
│   └── guia-del-proyecto.md          Este documento
└── src/
    ├── app/                  Next.js App Router: layout, página, estilos
    ├── application/          Casos de uso (vacío, documentado)
    ├── domain/idea/          Núcleo puro: modelo + proyecciones + tests
    └── infrastructure/       Adaptadores: DB, IA, auth (vacío, documentado)
```

---

## 6. Arquitectura en cinco minutos

### Capas y regla de dependencia

```
app/  →  application/  →  domain/
                              ▲
infrastructure/ ──────────────┘
```

Las flechas apuntan siempre hacia `domain`. **`domain` no importa nada de las
otras capas**: ni Next, ni React, ni base de datos, ni proveedor de IA.

### El patrón: proyecciones

Una idea se modela **una sola vez** como un grafo de diez dimensiones. Cada
metodología es una **función pura** sobre ese grafo.

```
                    ┌──────────────┐
                    │   IdeaGraph  │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      buildTree()     findGaps()     (canvas…)
        árbol          agenda         futuras
```

Consecuencias:

- Agregar una metodología nueva es escribir una función, no migrar datos.
- El historial se guarda sobre el grafo: todas las vistas lo heredan.
- Las proyecciones se testean con un objeto literal, sin base de datos.

### Procedencia de los nodos

Cada nodo declara de dónde salió:

| Fuente | Significado | ¿Cierra un hueco? |
|---|---|---|
| `inferred` | La IA lo propuso, el usuario no lo validó | No |
| `confirmed` | El usuario validó una propuesta | Sí |
| `edited` | El usuario lo escribió a mano | Sí |

**Precedencia de merge:** `edited` > `confirmed` > `inferred`.

Un nodo `inferred` no cierra un hueco porque **es una pregunta, no una
respuesta**. Mientras no haya validación humana, el coach sigue insistiendo.

### La IA se usa solo donde hace falta

| Tarea | ¿Usa IA? |
|---|---|
| Conversar con el usuario | Sí |
| Extraer estructura de la conversación | Sí |
| Detectar qué dimensión falta | **No** — es una consulta determinística |

`findGaps` es una función pura: cuesta cero, no falla y es trivial de testear.

---

## 7. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | Modelo canónico + proyecciones | Una sola fuente de verdad; agregar metodologías es barato |
| D2 | La IA propone, nunca escribe | La extracción es probabilística; el usuario valida |
| D3 | Edición directa solo en nodos `confirmed` | Equilibra control del usuario y protección contra sobreescritura |
| D4 | Procedencia obligatoria por nodo | Habilita confianza, trazabilidad e historial con un solo campo |
| D5 | Next.js 16 + Postgres + pnpm | Stack elegido; alternativa Vite + Hono evaluada y descartada |
| D6 | La IA son tres trabajos separados | Chat, extracción y detección de huecos tienen costos y modelos distintos |

El detalle y el razonamiento completo están en
[`arquitectura.md`](./arquitectura.md) y en la sección 3 de
[`especificacion-funcional.md`](./especificacion-funcional.md).

---

## 8. Cómo verificar que funciona

```bash
pnpm typecheck    # sin salida = correcto
pnpm test         # Test Files 2 passed, Tests 9 passed
pnpm build        # compila y genera las rutas /
```

Los tres deben pasar en una máquina limpia después de `pnpm install`. Si alguno
falla, el problema es del entorno (versión de Node o de pnpm), no del código.

---

## 9. Qué sigue

Orden de construcción. **No se saltea el orden**: cada paso deja algo
demostrable.

```
1. Modelo de datos + seed de la idea demo
2. Autenticación + cuenta demo
3. Vistas sobre el grafo (árbol, card) — sin IA, datos fijos
4. Chat con streaming — sin extracción todavía
5. Extracción + confirmación de nodos
6. Historial + diff entre versiones
7. Modo demo: fallback sin IA, reset, precalentado
```

La razón del orden: si el tiempo se acaba, en el paso 4 ya hay una demo que se
ve completa. Si se empieza por la IA y falla, no hay nada que mostrar.

El modo demo (paso 7) es prioritario porque la evaluación es una **demo en
vivo**: un fallo del proveedor de IA durante la presentación es un riesgo de
entrega, no un bug menor.

---

## 10. Convenciones

- **TypeScript estricto.** Sin `any` en el dominio.
- **Dominio puro.** Si un archivo en `src/domain` importa algo externo, es un
  error de arquitectura.
- **Idioma:** identificadores y comentarios de código en inglés; documentación
  en español.
- **Tests junto al código** (`*.test.ts`), no en un árbol paralelo.
- **Commits convencionales:** `feat:`, `fix:`, `docs:`, `chore:`. Sin
  atribución a herramientas.

---

## 11. Notas y limitaciones conocidas

- `next-env.d.ts` es generado por Next.js y está en `.gitignore`. No lo
  commitees.
- `AGENTS.md` lo genera `next dev` automáticamente y también está ignorado.
- El layout usa tipos explícitos de React en vez de `LayoutProps` generado, para
  que `pnpm typecheck` pase en un clon limpio sin haber corrido `next build`.
- No se usa `next/font`, para que el build no dependa de la red.
- Las variables de entorno viven en `.env.local` (ignorado). La plantilla es
  `.env.example`.

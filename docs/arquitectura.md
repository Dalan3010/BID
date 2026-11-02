# Arquitectura y patrón de diseño

Documento de referencia del cimiento del proyecto. Describe **cómo está
organizado** el código y **por qué**, no qué funcionalidades existen.

Complementa a [`especificacion-funcional.md`](./especificacion-funcional.md),
que define el producto.

---

## 1. Principios

| # | Principio | Consecuencia práctica |
|---|---|---|
| P1 | El dominio no conoce la infraestructura | `src/domain` no importa Next, React, base de datos ni proveedor de IA |
| P2 | Una sola fuente de verdad | Las ideas se modelan una vez; cada vista es una proyección |
| P3 | Las proyecciones son funciones puras | Mismo grafo, mismo resultado; sin efectos, sin llamadas de red |
| P4 | La IA propone, nunca escribe | Toda salida del modelo entra como `inferred` y requiere validación |
| P5 | Lo determinístico no usa IA | Detectar huecos es una consulta, no una llamada al modelo |

---

## 2. Capas y regla de dependencia

```
        ┌─────────────────────────────────────────┐
        │  app/            (Next.js: rutas y UI)  │
        └───────────────────┬─────────────────────┘
                            │ depende de
        ┌───────────────────▼─────────────────────┐
        │  application/    (casos de uso)         │
        └───────────────────┬─────────────────────┘
                            │ depende de
        ┌───────────────────▼─────────────────────┐
        │  domain/         (modelo canónico)      │
        └─────────────────────────────────────────┘
                            ▲
        ┌───────────────────┴─────────────────────┐
        │  infrastructure/ (adaptadores)          │
        └─────────────────────────────────────────┘
```

**Regla única:** las flechas de dependencia apuntan siempre hacia `domain`.
`domain` no importa nada de las otras capas. `infrastructure` implementa
detalles (Postgres, proveedor de IA, auth) y es la única capa que conoce
tecnología externa.

La razón es testeabilidad y longevidad: el núcleo se puede probar sin base de
datos, sin red y sin modelo, y cambiar de proveedor no toca las reglas del
negocio.

---

## 3. Mapa de directorios

```
src/
├── app/                        Next.js App Router: rutas, layouts, páginas
├── application/                Casos de uso y puertos (aún vacío)
├── domain/
│   └── idea/
│       ├── types.ts            Modelo canónico: nodos, fuentes, jerarquía
│       ├── projections/
│       │   ├── gaps.ts         Proyección: huecos y completitud
│       │   └── tree.ts         Proyección: jerarquía visual
│       └── index.ts            Punto de entrada del módulo
└── infrastructure/             Adaptadores: base de datos, IA, auth (aún vacío)
```

---

## 4. Modelo canónico

Una idea se describe con **diez dimensiones** (`NodeType`). Cada pieza de
conocimiento es un `IdeaNode` que pertenece a una dimensión y declara su
procedencia.

```ts
type NodeSource = "inferred" | "confirmed" | "edited";
```

| Fuente | Significado | ¿Cierra un hueco? |
|---|---|---|
| `inferred` | La IA lo propuso, el usuario no lo validó | No |
| `confirmed` | El usuario validó una propuesta | Sí |
| `edited` | El usuario lo escribió o reescribió | Sí |

**Precedencia de merge:** `edited` > `confirmed` > `inferred`.

Un nodo `inferred` no cierra un hueco porque **es una pregunta, no una
respuesta**. Mientras no haya validación humana, el coach sigue insistiendo.
Eso es lo que evita que la app se llene de datos que el usuario nunca afirmó.

El campo `source` cumple tres funciones a la vez:

1. **Confianza:** se puede mostrar de dónde salió cada afirmación.
2. **Trazabilidad:** `messageId` permite volver al mensaje que la originó.
3. **Conflicto:** la precedencia de merge es una consecuencia directa del campo.

---

## 5. El patrón: proyecciones

> Una metodología no es un esquema de datos. Es una **función** del grafo.

```
                    ┌──────────────┐
                    │   IdeaGraph  │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      buildTree()     findGaps()     (canvas…)
        árbol          agenda         futuras
```

Una proyección:

- recibe `IdeaGraph` y devuelve datos de presentación;
- no muta la entrada;
- no lee base de datos, red ni reloj;
- se testea con un objeto literal.

Ejemplo real del repositorio:

```ts
export function findGaps(graph: IdeaGraph): Gap[] {
  return NODE_TYPES.flatMap((type) => {
    const nodes = graph.nodes.filter((node) => node.type === type);
    if (nodes.some(isFilled)) {
      return [];
    }
    return [{ type, hasProposals: nodes.length > 0 }];
  });
}
```

**Por qué importa:** agregar una metodología nueva es escribir una función, no
migrar datos. Y como el historial se guarda sobre el grafo, todas las
proyecciones heredan el historial sin trabajo extra.

### Jerarquía como dato, no como código

El árbol no está escrito a mano. Se deriva de `NODE_PARENT`:

```ts
export const NODE_PARENT: Readonly<Record<NodeType, NodeType | null>> = {
  problem: null,
  segment: "problem",
  value_proposition: "problem",
  solution: "value_proposition",
  channels: "solution",
  revenue: "solution",
  // …
};
```

Cambiar la jerarquía cambia la vista para todos los usuarios **sin tocar datos
almacenados**.

---

## 6. Por qué no una base de datos de grafos

El grafo de una idea tiene decenas de nodos, no millones de relaciones. Postgres
con `jsonb` cubre el caso sin costo operativo extra.

Una base de grafos aquí sería una dependencia, un lenguaje de consulta y un
modelo mental adicionales para resolver un problema que no existe. La regla es
simple: **se paga complejidad cuando el volumen la justifica, no antes.**

---

## 7. La capa de IA

La IA se usa en tres puntos distintos, y **no** son la misma llamada:

| Punto | Qué hace | Determinístico |
|---|---|---|
| Conversar | Responde con streaming | No |
| Extraer | Conversación → nodos propuestos | No |
| Detectar huecos | Qué dimensión falta | **Sí** (`findGaps`) |

La detección de huecos está implementada como función pura precisamente para
demostrar el principio P5: si no necesita un modelo, no lo usa. Cuesta cero,
no falla y es trivial de testear.

La extracción se implementará en `infrastructure/ai` y su salida **debe** pasar
por validación de esquema antes de tocar el dominio. El dominio nunca recibe
JSON sin validar.

---

## 8. Estado actual

Implementado:

- Scaffold de Next.js 16 + TypeScript + Tailwind 4.
- Modelo canónico (`src/domain/idea/types.ts`).
- Proyecciones puras: `findGaps`, `completionRatio`, `buildTree`.
- Tests de las proyecciones (9 casos).

Deliberadamente **no** implementado todavía:

- Base de datos y persistencia.
- Autenticación.
- Integración con proveedor de IA.
- Rutas de la aplicación y componentes de UI.
- Seed de la demo.

El orden de construcción está definido en la especificación funcional: primero
lo visible con datos fijos, la IA al final.

---

## 9. Convenciones

- **TypeScript estricto** (`strict: true`). Sin `any` en el dominio.
- **Dominio puro:** si un archivo en `src/domain` importa algo externo, es un
  error de arquitectura.
- **Comentarios en inglés**, identificadores en inglés, documentación en
  español.
- **Commits convencionales** (`feat:`, `fix:`, `docs:`, `chore:`), sin
  atribución a herramientas.
- **Tests junto al código** (`*.test.ts`), no en un árbol paralelo.

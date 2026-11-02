# Especificación Funcional — Coach de Ideas de Negocio

**Estado:** borrador para validación (v0.1)
**Fecha:** 2026-11-01
**Alcance:** definición de producto y requisitos. No incluye implementación.

---

## 1. Visión del producto

Una aplicación web que funciona como **coach** para ayudar a un emprendedor a cimentar e iniciar su idea de negocio.

El usuario conversa en lenguaje natural. El sistema **extrae estructura** de esa conversación y la proyecta en visualizaciones (árbol, card, canvas) que muestran qué tan sólida está la idea y qué falta.

**Principio rector:** el valor no está en la conversación, está en que el sistema **recuerde, ordene y devuelva un plan**. Sin metodología, memoria y artefactos persistentes, el producto es un wrapper de chat.

**Bucle central del producto:**

```
El grafo detecta un hueco → el coach pregunta por ese hueco
        ↑                                    ↓
   la vista se actualiza  ←──── el usuario responde
```

La visualización dirige la conversación, no al revés.

---

## 2. Actores

| Actor | Descripción |
|---|---|
| **Usuario** | Emprendedor. Se registra solo, gestiona sus propias ideas. Único actor de negocio. |

No existe rol de administrador de negocio en v1. La operación de plataforma (soporte, métricas) queda fuera del producto.

---

## 3. Decisiones de arquitectura

### D1 — Modelo canónico + proyecciones

Existe **un único modelo de datos** (el grafo de la idea). Cada metodología es una **proyección** sobre ese modelo, no un esquema propio.

```
Conversación ──extracción──▶ MODELO CANÓNICO ──proyección──▶ Canvas
 (natural)     (IA propone)    (grafo único)   ├───────────▶ Árbol
                                               ├───────────▶ Card
                                               └───────────▶ Historial
```

**Consecuencias:**

- Agregar una metodología nueva es un mapeo, no una migración.
- El historial se guarda una sola vez, sobre el grafo. Todas las vistas lo heredan.
- La diferencia entre lentes es información de coaching ("sólido en problema, vacío en ingresos").

**Regla de alcance:** en v1 se construye **un** modelo canónico y **una** proyección (árbol). Una segunda lente solo se agrega cuando el canónico esté validado.

### D2 — La IA propone, no escribe

La extracción de lenguaje natural a estructura es probabilística. Todo nodo inferido entra con estado `inferido` y requiere confirmación del usuario. La IA nunca escribe directo en la fuente de verdad.

### D3 — Edición directa restringida

El usuario puede editar a mano **solo nodos en estado `confirmado`**. Los nodos `inferido` se corrigen conversando.

**Jerarquía de merge:** `editado` > `confirmado` > `inferido`.

Un nodo `editado` nunca es sobrescrito por una re-extracción automática.

### D4 — Procedencia obligatoria

Cada nodo del grafo registra su origen. Esto habilita historial, trazabilidad y confianza de forma simultánea.

```ts
type Node = {
  id: string
  type: NodeType
  content: string
  source: 'inferred' | 'confirmed' | 'edited'
  message_id: string | null   // mensaje que lo originó
  confidence: number | null   // solo para inferred
  created_at: string
  updated_at: string
}
```

### D5 — Stack tecnológico

| Capa | Elección |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Base de datos | Postgres (Neon o Supabase, free tier) |
| ORM | Drizzle |
| Auth | Better Auth |
| IA | Vercel AI SDK + Zod para salida estructurada |
| UI | Tailwind + shadcn/ui |
| Árbol | React Flow |
| i18n | next-intl |
| Deploy | Vercel (hobby) |

**Descartado explícitamente:** Neo4j o cualquier graph DB (el grafo es de decenas de nodos por idea; Postgres con `jsonb` alcanza), backend separado, GraphQL, Redux.

**Alternativa evaluada y descartada por decisión del usuario:** Vite + React + Hono. Se planteó que Next.js aporta SSR/SEO/RSC, capacidades que este producto no usa (app 100% autenticada, sin páginas públicas), y que su frontera server/client añade complejidad de defensa. El usuario decidió mantener Next.js de forma deliberada. Consecuencia asumida: el equipo debe evitar el uso profundo de Server Components y el caché implícito, y explicar esas decisiones en la defensa.

### D6 — Arquitectura de IA

La capa de IA son **tres trabajos separados**, no un prompt único:

| Trabajo | Función | Modelo |
|---|---|---|
| Conversar | Respuesta en lenguaje natural, con streaming | Uno de calidad |
| Extraer | Conversación → nodos estructurados (JSON validado con Zod) | Uno rápido y barato |
| Decidir el próximo hueco | Detección de nodos faltantes | **Ninguno** — consulta SQL |

**Pipeline:**

```
Usuario escribe
      │
      ▼
[1] CHAT  ──── streaming ────▶  el usuario ve la respuesta
      │
      │ (en segundo plano, no bloquea el chat)
      ▼
[2] EXTRACCIÓN  ──▶  JSON propuesto  ──▶  Zod valida  ──▶  estado `inferido`
      │
      ▼
[3] HUECOS  ──▶  SQL: tipos de nodo faltantes  ──▶  agenda del coach
      │
      ▼
[4] La vista se actualiza + el coach pregunta por el hueco
```

**Reglas de costo:**

1. El grafo **es** la memoria. No se usa RAG ni base vectorial. El contexto enviado al modelo es constante: system prompt + grafo actual + últimos N mensajes + resumen rodante.
2. La extracción **no corre en cada mensaje**: cada 3–4 mensajes o en pausas de conversación.
3. La detección de huecos es determinística (comparación de tipos de nodo contra el modelo canónico), no una llamada al modelo.
4. Toda salida del modelo pasa por validación de esquema. JSON inválido se descarta y se reintenta una sola vez.

---

## 4. Modelo canónico (v1)

Entidades mínimas. De este conjunto deben poder derivarse Lean Canvas, Business Model Canvas y el árbol sin agregar campos.

| Tipo de nodo | Descripción |
|---|---|
| `problem` | Problema o necesidad que resuelve |
| `segment` | Segmento de cliente / usuario objetivo |
| `value_proposition` | Propuesta de valor |
| `solution` | Solución o producto |
| `channels` | Canales de llegada al cliente |
| `revenue` | Modelo de ingresos |
| `costs` | Estructura de costos |
| `competition` | Competencia y alternativas |
| `metrics` | Métricas de éxito |
| `risks` | Riesgos y supuestos a validar |

**Relaciones:** `segment ─ problem`, `problem ─ value_proposition`, `value_proposition ─ solution`, `solution ─ channels`, `solution ─ revenue`, `solution ─ costs`, `solution ─ competition`, `solution ─ metrics`.

---

## 5. Requisitos funcionales

### Módulo A — Cuenta y acceso

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-01 | Registro autónomo con email y contraseña | El usuario crea su cuenta sin intervención de terceros; recibe verificación por email |
| RF-02 | Inicio de sesión | Credenciales válidas abren sesión; inválidas devuelven error genérico sin filtrar si el email existe |
| RF-03 | Cierre de sesión | La sesión se invalida en servidor, no solo en cliente |
| RF-04 | Recuperación de contraseña | Flujo por email con token de un solo uso y expiración |
| RF-05 | Ver y editar perfil propio | Nombre, email, contraseña. Cambio de contraseña exige la actual |
| RF-06 | Eliminar cuenta | Requiere confirmación explícita; ofrece exportación previa de datos |

### Módulo B — Ideas de negocio

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-10 | Crear idea de negocio | Desde cero o a partir de una conversación con el coach |
| RF-11 | Listar ideas | Muestra nombre, estado, fecha y porcentaje de completitud |
| RF-12 | Editar metadatos de la idea | Nombre, descripción corta, estado |
| RF-13 | Eliminar idea | Confirmación explícita; borrado lógico recuperable por 30 días |
| RF-14 | Ciclo de vida de la idea | `draft → validation → mvp → launch`. El coach adapta su comportamiento al estado |
| RF-15 | Buscar y filtrar ideas | Por texto y por estado |

### Módulo C — Coach conversacional

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-20 | Conversación en lenguaje natural con streaming | El primer token llega en menos de 2 s en condiciones normales |
| RF-21 | Memoria por idea | El coach conserva el contexto de la idea entre sesiones sin reenviar el historial completo |
| RF-22 | Detección de huecos | El coach identifica nodos faltantes o débiles y pregunta por ellos de forma priorizada |
| RF-23 | Confirmación de inferencias | Todo nodo inferido se presenta al usuario para confirmar o corregir |
| RF-24 | Cuotas de uso | Límite por usuario con mensaje claro al alcanzarlo; sin corte silencioso |
| RF-25 | Degradación ante fallo del modelo | Error visible, reintento manual, la conversación no se pierde |
| RF-26 | Próximos pasos accionables | El coach propone tareas concretas derivadas de los huecos |
| RF-27 | Límites de asesoramiento | El coach declara que no sustituye asesoría legal, contable ni financiera profesional |

### Módulo D — Extracción y grafo

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-30 | Extracción de conversación a grafo | La IA propone nodos y relaciones; nada se persiste sin pasar por el estado `inferido` |
| RF-31 | Procedencia por nodo | Todo nodo guarda `source`, `message_id` y `confidence` cuando aplique |
| RF-32 | Edición directa de nodos | Solo habilitada en nodos `confirmado` |
| RF-33 | Política de merge | `editado` nunca se sobrescribe automáticamente |
| RF-34 | Versionado del grafo | Cada cambio confirmado genera una versión inmutable |

### Módulo E — Visualizaciones

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-40 | Vista árbol | Representación jerárquica de la idea derivada del grafo |
| RF-41 | Vista card | Resumen visual de la idea con estado y completitud |
| RF-42 | Vista canvas | Primera lente metodológica sobre el mismo grafo |
| RF-43 | Indicador de completitud | Por dimensión del modelo, no solo global |
| RF-44 | Múltiples lentes | La misma idea se puede ver bajo distintas metodologías sin duplicar datos |

### Módulo F — Historial

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-50 | Historial del árbol | Lista de versiones del grafo con fecha |
| RF-51 | Comparación entre versiones | Diff visual de nodos agregados, modificados y eliminados |
| RF-52 | Trazabilidad nodo → mensaje | Desde cualquier nodo se puede ver la conversación que lo originó |

### Módulo G — Plataforma

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-60 | Diseño responsive | Uso pleno en móvil; el chat es el caso de uso principal en móvil |
| RF-61 | Internacionalización | Español e inglés desde el inicio, sin hardcodear textos |

### Módulo H — Modo demo (prioridad alta: la evaluación es en vivo)

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-70 | Cuenta demo con datos sembrados | Una idea con grafo completo, todas las vistas pobladas, acceso en un click |
| RF-71 | Recorrido guionado | Login → listado → idea → árbol → chat → hueco detectado → respuesta → árbol actualizado → historial |
| RF-72 | Fallback sin IA | Si el proveedor falla o no hay cuota, respuestas predefinidas con el mismo streaming; el recorrido nunca se corta |
| RF-73 | Reset de la demo | Un botón restaura el estado sembrado para poder repetir el recorrido |
| RF-74 | Precalentamiento | La primera llamada al modelo no ocurre frente al jurado; el arranque en frío se resuelve antes |

---

## 6. Requisitos no funcionales

| ID | Categoría | Requisito |
|---|---|---|
| RNF-01 | Seguridad | Contraseñas hasheadas con algoritmo lento (bcrypt/argon2); nunca en logs |
| RNF-02 | Seguridad | Sesiones con token de acceso corto + refresh rotativo |
| RNF-03 | Seguridad | Rate limiting en login y en endpoints del coach |
| RNF-04 | Seguridad | Bloqueo temporal tras intentos fallidos repetidos |
| RNF-05 | Privacidad | El contenido de las ideas es propiedad intelectual del usuario |
| RNF-06 | Privacidad | El contenido del usuario **no** se usa para entrenar modelos; declarado explícitamente |
| RNF-07 | Privacidad | Exportación completa de datos del usuario en formato legible |
| RNF-08 | Privacidad | Borrado real tras el período de gracia |
| RNF-09 | Costo | Tope de gasto de IA por usuario y por mes, con alertas internas |
| RNF-10 | Observabilidad | Registro de cada llamada al modelo: tokens, costo, latencia, versión de prompt |
| RNF-11 | Observabilidad | Versionado de prompts para poder comparar y revertir comportamiento |
| RNF-12 | Rendimiento | Latencia percibida del coach: primer token < 2 s |
| RNF-13 | Disponibilidad | Backup diario con restauración verificada |
| RNF-14 | Mantenibilidad | Las proyecciones son funciones puras del grafo, sin lógica de negocio propia |
| RNF-15 | Resiliencia de demo | La aplicación debe ser demostrable de punta a punta sin conexión al proveedor de IA |
| RNF-16 | Latencia percibida | El primer token debe aparecer en menos de 1,5 s durante la demo |
| RNF-17 | Costo operativo | La demo debe funcionar dentro de free tiers, sin tarjeta asociada |

---

## 7. Fuera de alcance (v1)

- Roles de administrador y backoffice.
- Compartir ideas entre usuarios o co-fundadores.
- Colaboración en tiempo real.
- Segunda y tercera lente metodológica (solo árbol + un canvas).
- Aplicación móvil nativa.
- Integraciones externas (CRM, contabilidad, etc.).

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La extracción estructura mal y el usuario pierde confianza | Alto | Estado `inferido` + confirmación explícita (D2) |
| La IA pisa ediciones humanas | Alto | Jerarquía de merge (D3) |
| El producto se percibe como "chat con carpetas" | Alto | Bucle hueco → pregunta → artefacto (sección 1) |
| Costo de IA descontrolado | Medio | Cuotas y topes (RF-24, RNF-09) |
| Scope creep de metodologías | Medio | Regla de alcance D1 |
| El usuario no ve progreso | Medio | Completitud siempre visible (RF-43) |
| Fuga de propiedad intelectual | Alto | RNF-05 a RNF-08 |

---

## 9. Pendientes de decisión

1. **Proveedor de modelo** — candidato: Google Gemini (free tier). Alternativa de extracción: Groq. Verificar límites vigentes.
2. **Primera lente metodológica** además del árbol — candidata: Lean Canvas.
3. **Compartir ideas** — ¿queda definitivamente fuera de v1?
4. **Alcance de i18n** — ¿español e inglés desde el día uno o español primero?

Resuelto: stack tecnológico (D5).

---

## 10. Registro de decisiones

**L1 — Pedido original del usuario (verbatim):**

> El sistema DEBE permitir a un crear usuarios
> El sistema DEBE permitir Eliminar un Usuario
> El sistema DEBE Permitir Editar un Usuario
> EL sistema DEBE permitir Visualizar la información del usuario
> El sistema DEBE permitir al usuario logearse en el sistema al usuario
> El sistema DEBE permitir al usuario Salirse del sistema
> El sistema DEBE permitir crear ideas de negocios al usuario
> EL sistema DEBE permitir editar una idea de negocio al usuario
> El sistema DEBE permitir eliminar una idea de negocio al usuario
> El sistema DEBE manejar cada idea de negocio en un chat propio
> El Sistema DEBE permitirte visualizar la idea de negocio en forma de CARD
> El sistema DEBE permitirte visualizar en la idea de negocio por medio de un diagrama de arbol
> El sistema DEBE permite visualizar un historial del diagrama de arbol

**L2 — Contexto aportado (verbatim):**

> es una app que básicmente funciona como un coach que te ayuda a cimentar e iniciar tu idea/emprendimiento, es deccir cada usuario entra y se logea solo, lo del arbol es solo una udea de visualización

**L3 — Decisión de producto (verbatim):**

> Que para el usuario se sienta natural, pero que la metodología sea una forma de visualización que la IA va estructurando, de hecho si hay más y hacer una interpolación, mejor

**L4 — Decisión de permisos (verbatim):**

> Vale, sigamos tu recomendación

Adoptado: edición directa habilitada **solo** sobre nodos `confirmado`; los nodos `inferido` se corrigen por conversación (D3).

**L5 — Restricciones del proyecto (verbatim):**

> React + TypeScript estoy bien, , explica mejor lo de IA, por ahora es un proyecto universitario, así que el presupuesto es bajo

**L6 — Condición de evaluación (verbatim):**

> En vivo, me gusta tu idea

Adoptado: la evaluación es una demo en vivo, por lo que el **modo demo (Módulo H)** pasa a prioridad alta. Un fallo del proveedor de IA durante la demo es un riesgo de entrega, no un bug menor.

**L7 — Decisión de stack (verbatim):**

> Dejemos next

Adoptado: se mantiene Next.js (D5). Se documenta la alternativa Vite + Hono y el tradeoff aceptado, para que la decisión quede justificable en la defensa.

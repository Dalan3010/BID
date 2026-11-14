# Flujo del Business Coach

Este documento describe **qué ve y qué puede hacer el usuario**, no cómo está
implementado por dentro.

## 1. La premisa

El usuario **no sabe organizar un negocio**. No tiene que saberlo.

El coach le hace preguntas que **cualquier persona puede responder** y, mientras
conversan, va armando el plan. El usuario ve cómo su idea toma forma y **entiende
por qué** cada cosa entra.

> El chat es el protagonista. El plan es el resultado visible. El grafo técnico
> es un detalle opcional.

## 2. Recorrido completo

```text
Landing
  │
  ▼
Registro / Login
  │
  ▼
Dashboard  ──── "Nueva idea"
  │                 │
  │                 ▼
  │            Crear idea (título)
  │                 │
  ▼                 ▼
Workspace de la idea
  ├── Chat con el coach        (protagonista)
  ├── "Lo que he entendido"    (propuestas explicadas)
  └── "Así va quedando tu plan" (resultado narrativo)
        │
        ▼
  Confirmar propuestas → el plan crece
        │
        ▼
  Seguir conversando → repetir
```

## 3. Pantallas

### 3.1 Landing (`/`)

Presenta el producto. Desde acá se va a registro o login.

### 3.2 Autenticación

| Ruta | Qué hace |
|---|---|
| `/sign-up` | Crear cuenta |
| `/sign-in` | Iniciar sesión |
| `/forgot-password` | Pedir reset |
| `/reset-password?token=…` | Definir nueva contraseña |

> No hay proveedor de correo. En desarrollo el link de reset aparece en el log de
> la API, con el token redactado salvo `AUTH_LOG_SECRETS=1`.

### 3.3 Dashboard (`/dashboard`)

Es el "libro" de ideas.

| Elemento | Qué muestra |
|---|---|
| Lista de ideas | Título, resumen y progreso |
| Progreso | Porcentaje de dimensiones validadas |
| Agenda | Qué falta, en el orden en que el coach lo va a preguntar |
| "Nueva idea" | Crea una idea con un título y navega a su workspace |

### 3.4 Workspace de la idea (`/ideas/[id]`)

Tres zonas:

```text
┌──────────────────────────────────────────────┬────────────────────────┐
│  Conversación con tu coach de negocio        │  Así va quedando tu    │
│                                              │  plan                  │
│  ┌────────────────────────────────────────┐  │                        │
│  │ Lo que he entendido (si hay propuestas)│  │  Problema: …           │
│  └────────────────────────────────────────┘  │  Cliente: …            │
│                                              │  Solución: …           │
│  Mensajes…                                   │                        │
│                                              │  ─────────────────     │
│  [ textarea ]                    [ Enviar ]  │  Ver estructura        │
│                                              │  técnica ▾             │
└──────────────────────────────────────────────┴────────────────────────┘
```

#### A) Conversación

- Empty state: *"Cuéntame tu idea sin rodeos. Yo te voy haciendo preguntas…"*
- El usuario escribe y envía.
- El coach responde **en streaming**, palabra por palabra.
- Estados visibles:
  - `Pensando contigo…` mientras responde.
  - `Voy entendiendo…` mientras se extrae estructura.
- El mensaje del usuario aparece de inmediato (optimista) y se reconcilia con el
  servidor.

#### B) "Lo que he entendido"

Aparece **después** de que el coach responde y la extracción encuentra algo
nuevo.

Cada propuesta muestra:

1. **La dimensión** en lenguaje humano (ej. "Cliente al que va dirigido").
2. **El contenido** que entendió.
3. **Por qué lo entendió** ("Viendo lo que me contaste, esto parece describir el
   dolor que quieres resolver.").
4. **Acciones conversacionales**:
   - `Sí, añadir al plan`
   - `Ajustarlo un poco` (abre un textarea)
   - `Mejor dejarlo`

> Nada entra al plan sin una de esas tres acciones.

#### C) "Así va quedando tu plan"

Vista **narrativa**, en orden lógico de negocio:

1. Problema
2. Cliente al que va dirigido
3. Propuesta de valor
4. Solución
5. Cómo llegar (canales)
6. Ingresos
7. Costos
8. Competencia
9. Métricas para saber si funciona
10. Riesgos a tener en cuenta

Comportamiento:

- Solo muestra dimensiones **validadas** (`confirmed`/`edited`).
- Cada bloque se lee como texto, no como nodo.
- Etiqueta `añadido` o `ajustado` según la procedencia.
- El bloque más reciente se ilumina brevemente cuando el plan crece.
- Si no hay nada: *"Aún no hay nada escrito. Empieza a hablarle al coach…"*

#### D) "Ver estructura técnica"

Desplegable, cerrado por defecto. Muestra el **árbol/grafo** real.

Es valor agregado para quien quiera ver la estructura, no el camino principal.

### 3.5 Perfil (`/profile`)

| Acción | Endpoint |
|---|---|
| Ver datos de la cuenta | sesión |
| Cambiar email | `/api/auth/change-email` |
| Cambiar contraseña | `/api/auth/change-password` |
| Exportar datos | `GET /api/account/export` |
| Eliminar cuenta | `/api/auth/delete-user` |
| Reset demo (solo cuenta demo) | `POST /api/demo/reset` |

## 4. Ciclo de una conversación

```text
1. Usuario escribe
        │
        ▼
2. Se guarda su mensaje
        │
        ▼
3. El coach responde (streaming)
        │
        ▼
4. Se guarda la respuesta completa
        │
        ▼
5. Se dispara la extracción (llamada aparte)
        │
        ├── cuota agotada → aviso, no se bloquea nada
        ├── nada nuevo     → no aparece panel
        └── hay propuestas → "Lo que he entendido"
        │
        ▼
6. Usuario decide:
        ├── Sí, añadir al plan  → nodo `confirmed`
        ├── Ajustarlo un poco   → nodo `edited`
        └── Mejor dejarlo       → se elimina
        │
        ▼
7. El plan se actualiza y el bloque nuevo se ilumina
        │
        ▼
8. Se repite desde 1
```

## 5. Qué pasa cuando algo falla

| Fallo | Qué ve el usuario | Qué pasa con sus datos |
|---|---|---|
| El proveedor de IA falla antes de responder | Respuesta del **guion** | Nada se pierde |
| El proveedor falla a mitad | Se conserva lo que llegó | Nada se pierde |
| El proveedor se queda sin cuota | Respuesta del **guion** | Nada se pierde |
| La extracción falla | Aviso suave | El grafo queda igual |
| Se agota la cuota de extracciones | Aviso explícito | Puede seguir conversando |
| Se corta la red | Aviso + recarga del estado real | El mensaje ya estaba guardado |
| El usuario entra a una idea ajena | "No encontramos esa idea" | — |

> **Regla de oro:** la demo nunca se corta. Ante cualquier fallo del proveedor,
> responde el guion.

## 6. Por qué este diseño

| Antes | Ahora |
|---|---|
| El grafo era el protagonista | El chat es el protagonista |
| "Propuestas" con etiquetas técnicas | "Lo que he entendido", explicado en lenguaje humano |
| "Aceptar / Rechazar" | "Sí, añadir al plan / Ajustarlo / Mejor dejarlo" |
| Ficha por dimensiones | Plan narrativo en orden de negocio |
| El árbol siempre visible | Árbol opcional tras un desplegable |

La diferencia importante: antes el usuario **validaba estructura**. Ahora el
usuario **construye su plan con alguien que le explica**.

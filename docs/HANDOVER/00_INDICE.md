# BID — Handover

Documentación de entrega del proyecto **BID**: coach conversacional que ayuda a
un emprendedor a convertir una idea de negocio en un plan estructurado.

> Este paquete está pensado para que otra persona pueda **entender, levantar,
> probar y continuar** el proyecto sin depender de quien lo escribió.

## Qué hay en esta carpeta

| # | Documento | Para qué sirve |
|---|---|---|
| 01 | [Onboarding](01_ONBOARDING.md) | Requisitos, instalación, variables de entorno, arranque y troubleshooting |
| 02 | [Diccionario de datos](02_DICCIONARIO_DATOS.md) | Tablas, columnas, tipos, relaciones y enums de la base |
| 03 | [Validaciones y reglas de negocio](03_VALIDACIONES_Y_REGLAS_NEGOCIO.md) | Qué se acepta, qué se rechaza y por qué (API + dominio) |
| 04 | [Contratos de API](04_CONTRATOS_API.md) | Todos los endpoints, payloads, respuestas, códigos de error y streaming |
| 05 | [Arquitectura](05_ARQUITECTURA.md) | Monorepo, capas, flujo de una petición y sistema de IA con fallback |
| 06 | [Docker y despliegue](06_DOCKER_Y_DESPLIEGUE.md) | `compose.yaml`, Postgres, init SQL, build y despliegue |
| 07 | [Flujo Business Coach](07_FLUJO_BUSINESS_COACH.md) | Recorrido del usuario, pantallas y comportamiento esperado |
| 08 | [Tests y calidad](08_TESTS_Y_CALIDAD.md) | Qué cubre cada test, cómo correrlos y qué no cubren |
| 09 | [Checklist de entrega](09_CHECKLIST_ENTREGA.md) | Verificación rápida antes de mostrar o entregar |

## Resumen en 30 segundos

- **Monorepo pnpm** con tres paquetes: `packages/core` (dominio puro),
  `apps/api` (Hono + Postgres + Better Auth + IA), `Frontend` (Next.js 16).
- El usuario **conversa** con un coach. El coach pregunta de a una cosa, en
  lenguaje simple, y va armando el plan.
- La IA **propone** estructura; **nada entra al plan sin que el usuario lo
  acepte, corrija o descarte**. Ese es el corazón del producto.
- Hay **modo rehearsal** (respuestas guionadas, sin API key) y **modo live**
  (Google Gemini) con **fallback automático al guion** si el proveedor falla o
  se queda sin cuota. La demo nunca se corta.
- La app se levanta con `pnpm dev`: cliente en `:3000`, API en `:3001`.

## Documentos previos que conviene leer

Estos ya existían y siguen siendo la referencia larga:

- [`docs/arquitectura.md`](../arquitectura.md) — decisiones de diseño (D1…D7)
- [`docs/especificacion-funcional.md`](../especificacion-funcional.md) — requisitos funcionales (RF-xx)
- [`docs/guia-del-proyecto.md`](../guia-del-proyecto.md) — guía narrativa
- [`docs/roadmap.md`](../roadmap.md) — fases
- [`README.md`](../../README.md) — arranque rápido

## Credenciales demo

| Campo | Valor |
|---|---|
| Email | `demo@bid.local` |
| Contraseña | `demo1234` |

Se crean con `pnpm db:seed`. La cuenta demo es la única que puede usar
`POST /api/demo/reset`.

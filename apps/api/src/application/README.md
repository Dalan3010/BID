# application/

Casos de uso: la coordinación entre el dominio y el mundo exterior.

Esta capa responde a la pregunta *"¿qué acciones puede realizar el sistema?"* y
no sabe cómo se guarda un dato ni qué proveedor de IA se usa. Depende solo de
`domain` y de **puertos** (interfaces) que declara aquí y que
`infrastructure/` implementa.

## Contenido

| Archivo | Rol |
|---|---|
| `ports/idea-repository.ts` | Puerto de persistencia del agregado `Idea` |
| `use-cases/create-idea.ts` | Crea una idea vacía, propiedad de un usuario |
| `use-cases/load-idea-graph.ts` | Carga el grafo completo o falla |
| `use-cases/propose-node.ts` | Registra una propuesta de la IA como `inferred` |
| `use-cases/confirm-node.ts` | El usuario valida: `inferred` → `confirmed` |
| `use-cases/edit-node.ts` | Edición directa: solo sobre nodos validados |
| `use-cases/get-coach-agenda.ts` | Huecos y completitud, sin modelo |
| `testing/in-memory-idea-repository.ts` | Implementación del puerto para tests |

Los tests de los casos de uso corren contra el repositorio en memoria: si
necesitaran Postgres, la capa no estaría desacoplada de verdad.

Ver [`../docs/arquitectura.md`](../../docs/arquitectura.md).

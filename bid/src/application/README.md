# application/

Casos de uso: la coordinación entre el dominio y el mundo exterior.

Esta capa responde a la pregunta *"¿qué acciones puede realizar el sistema?"* y
no sabe cómo se guarda un dato ni qué proveedor de IA se usa. Depende solo de
`domain` y de **puertos** (interfaces) que declara aquí y que
`infrastructure/` implementa.

Contenido previsto:

- Crear, editar y eliminar una idea.
- Registrar y confirmar un nodo propuesto por la IA.
- Iniciar una conversación y obtener la siguiente pregunta del coach.

Nada de esto está implementado todavía. Ver
[`../docs/arquitectura.md`](../docs/arquitectura.md).

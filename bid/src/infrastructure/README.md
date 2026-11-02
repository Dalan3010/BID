# infrastructure/

Adaptadores: la única capa que conoce tecnología externa.

Aquí viven las implementaciones concretas de los puertos declarados en
`application/`. Cambiar de proveedor de IA o de base de datos no debería tocar
`domain/` ni `application/`.

Contenido previsto:

- `db/` — persistencia en Postgres (esquema, repositorios).
- `ai/` — cliente del proveedor, prompts versionados, validación de esquema.
- `auth/` — registro, sesiones, verificación por email.

Regla: **ninguna respuesta del modelo entra al dominio sin validar**. La
validación de esquema es responsabilidad de esta capa.

Nada de esto está implementado todavía. Ver
[`../docs/arquitectura.md`](../docs/arquitectura.md).

# infrastructure/

Adaptadores: la única capa que conoce tecnología externa.

Aquí viven las implementaciones concretas de los puertos declarados en
`application/`. Cambiar de proveedor de IA o de base de datos no debería tocar
`domain/` ni `application/`.

## Contenido

| Archivo | Rol |
|---|---|
| `db/schema.ts` | Tablas, enums e índices (Drizzle) |
| `db/client.ts` | Conexión a Postgres, cacheada entre recargas |
| `db/idea-repository.ts` | Implementación del puerto `IdeaRepository` |
| `db/migrate.ts` | Aplica `drizzle/*.sql` |
| `db/seed.ts` | Siembra la idea demo con las diez dimensiones |
| `db/idea-repository.test.ts` | Test de integración (opt-in con `TEST_DATABASE_URL`) |

Previsto para las próximas fases: `ai/` (cliente del proveedor, prompts
versionados, validación de esquema) y `auth/`.

Regla: **ninguna respuesta del modelo entra al dominio sin validar**. La
validación de esquema es responsabilidad de esta capa.

Ver [`../docs/arquitectura.md`](../../docs/arquitectura.md).

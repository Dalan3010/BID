# E2E — recorrido contra la API real

```bash
# 1. En la raíz: base de datos, API y cliente
docker compose up -d && pnpm db:migrate && pnpm db:seed
pnpm dev

# 2. Un Chromium (una de las dos):
pnpm --filter @bid/web exec playwright install chromium     # descarga el de esta versión
export BID_E2E_CHROMIUM=/ruta/a/chrome-o-chrome-headless-shell  # o usa uno existente

# 3. En otra terminal
pnpm --filter @bid/web e2e
```

| Variable | Por defecto | Para qué |
|---|---|---|
| `BID_E2E_URL` | `http://localhost:3000` | Dónde está el cliente |
| `BID_E2E_CHROMIUM` | (el de Playwright) | Ruta a un Chromium ya instalado |

Qué hace:

- **Recorrido con una cuenta temporal** (`e2e-<fecha>@bid.local`), que se
  **elimina al final**: crear idea → tema de la bienvenida → mensaje con stream
  → propuestas → confirmar → descartar con «Deshacer» → recarga → trazabilidad,
  lienzo y línea de tiempo.
- **Cuenta demo, solo lectura**: buscar y filtrar, la guía del primer acceso y
  el aviso de idea inexistente.

Si una prueba falla a mitad, la cuenta temporal puede quedar creada. Se puede
borrar entrando con ella o desde la base:
`docker exec bid-postgres psql -U bid -d bid -c "delete from users where email like 'e2e-%@bid.local'"`.

# Checklist de entrega

Verificación rápida antes de mostrar, entregar o retomar el proyecto.

## 1. Entorno

- [ ] `pnpm install` sin errores
- [ ] `.env.local` existe (copiado de `.env.example`)
- [ ] `BETTER_AUTH_SECRET` generado (`openssl rand -base64 32`)
- [ ] `DATABASE_URL` apunta a Postgres local
- [ ] `WEB_ORIGIN` y `NEXT_PUBLIC_API_URL` coinciden con los puertos reales
- [ ] `docker compose up -d` levanta Postgres sin errores
- [ ] `pnpm db:migrate` aplica sin fallos
- [ ] `pnpm db:seed` crea la demo

## 2. Arranque

- [ ] `pnpm dev` levanta API (`:3001`) y web (`:3000`)
- [ ] `GET http://localhost:3001/api/health` → `{ "ok": true }`
- [ ] `http://localhost:3000` carga sin errores en consola

## 3. Autenticación

- [ ] Login con `demo@bid.local` / `demo1234` funciona
- [ ] El dashboard muestra las ideas demo
- [ ] Sign-out cierra sesión
- [ ] Una ruta protegida sin sesión redirige o responde `401`

## 4. Flujo principal (Business Coach)

- [ ] Crear una idea nueva
- [ ] El workspace abre con el chat visible
- [ ] El empty state invita a escribir
- [ ] Enviar un mensaje: aparece de inmediato
- [ ] El coach responde **en streaming**
- [ ] El estado `Pensando contigo…` aparece mientras responde
- [ ] Tras responder, se dispara la extracción
- [ ] Si hay propuestas, aparece **"Lo que he entendido"**
- [ ] Cada propuesta muestra su **explicación**
- [ ] `Sí, añadir al plan` → el nodo pasa a `confirmed`
- [ ] `Ajustarlo un poco` → se guarda como `edited`
- [ ] `Mejor dejarlo` → desaparece
- [ ] **"Así va quedando tu plan"** se actualiza
- [ ] El bloque nuevo se ilumina brevemente
- [ ] `Ver estructura técnica` muestra/oculta el árbol

## 5. Persistencia

- [ ] Recargar la página conserva mensajes y plan
- [ ] Cerrar y volver a entrar conserva todo
- [ ] Una idea de otro usuario responde "No encontramos esa idea"

## 6. Resiliencia de IA

- [ ] Con `COACH_PROVIDER=rehearsal`, la conversación funciona sin API key
- [ ] Con `COACH_PROVIDER=live` y key válida, responde el modelo real
- [ ] Con `COACH_PROVIDER=live` y key inválida, **responde el guion** y la
      conversación no se corta
- [ ] El log muestra `[api] provider failed, answering from the script:`

## 7. Cuota

- [ ] Con `COACH_QUOTA=1`, la segunda extracción devuelve `429`
- [ ] El aviso de cuota se muestra sin bloquear el chat
- [ ] Se puede seguir conversando después del aviso

## 8. Demo

- [ ] `POST /api/demo/reset` restaura el libro demo
- [ ] El reset falla con `403` desde una cuenta no demo
- [ ] La agenda del dashboard coincide con lo que falta

## 9. Calidad

- [ ] `pnpm typecheck` pasa
- [ ] `pnpm test` pasa
- [ ] `pnpm lint` pasa
- [ ] `node apps/web/e2e/flow.spec.mjs` pasa (si Playwright está instalado)

## 10. Documentación

- [ ] `README.md` actualizado
- [ ] `docs/HANDOVER/` completo
- [ ] `.env.example` refleja todas las variables usadas
- [ ] No hay secretos en el repo
- [ ] `.env.local` **no** está commiteado

## 11. Git

- [ ] `git status` limpio (o solo cambios intencionales)
- [ ] Commits con mensajes convencionales
- [ ] Sin atribución de IA en los commits
- [ ] Sin archivos temporales (`*.log`, `.next/`, `node_modules/`)

## 12. Entrega

- [ ] ZIP generado sin `node_modules`, `.next`, `.env.local` ni `*.log`
- [ ] Credenciales demo documentadas
- [ ] Instrucciones de arranque incluidas
- [ ] Contacto / responsable identificado

---

## Comando de verificación rápida

```bash
pnpm typecheck && pnpm test && pnpm lint && echo "TODO OK"
```

# Reporte — Plan 00 · Fundación

Rama: `plan-00` · Ejecutado por Sonnet (superpowers:executing-plans) y revisado por Opus · 2026-09-28

## Tareas completadas

1. **Scaffold del proyecto y tooling** — Next.js 16 (App Router, `src/`, TS strict), Tailwind v4, Vitest + Testing Library, `cn()`. Commit `d95d010`.
2. **Base de datos, migraciones y BD de prueba** — Drizzle + `postgres.js`, PGlite para tests (`createTestDb`), `docker-compose.yml`, `scripts/seed.ts`. Commit `e47bca2`.
3. **Dominio de publicación** — `isPublic`, `publicScope` (Drizzle SQL equivalente), con test de integración comparando ambos contra 6 combinaciones. Commit `e078b5f`.
4. **Auth con lista blanca** — Better Auth (email+contraseña y Google), tablas `user/session/account/verification` + `allowed_emails`, hooks `beforeUserCreate`/`beforeSessionCreate`, `requireAdmin`, `proxy.ts`, `scripts/create-admin.ts`. Commit `db9af57`.
5. **Auditoría y papelera** — `audit_log`, `logAudit`, `registerTrashable`/`softDelete`/`restore`/`listTrash`/`purgeExpired`, `GET /api/cron/purge` con `Bearer ${CRON_SECRET}`, `vercel.json` (cron 04:00 UTC). Commit `24e9cad`.
6. **Sistema de diseño** — tokens GC en `@theme`, fuentes (Anton/Barlow/Barlow Condensed), `Logo`, `Button` (primary/ghost/dark con relleno animado), `SectionHeading`, `Tag`, `Flag` (SVG local). Commit `18b7afe`.
7. **Layout público** — `Header` (sólido tras 40px, oculta/reaparece con el scroll), `MobileMenu`, `Footer`, `SmoothScroll` (Lenis + GSAP con import dinámico, respeta `prefers-reduced-motion`), e2e con Playwright. Commit `ae273ea`.
8. **Shell del panel admin y usuarios** — shadcn/ui (tema oscuro con tokens GC, `--radius: 0`), sidebar con 12 secciones, `/admin/login`, `AdminPage`, gestión de lista blanca (agregar/quitar con diálogo de confirmación, tabla en escritorio + tarjetas en móvil), papelera e historial, e2e de login→Usuarios→Historial. Commit `f2b6c43`.

Commit adicional fuera de una tarea específica: `chore: add pnpm typecheck script` (ver desviaciones).

## Desviaciones (ver `docs/decisions.md` para el detalle completo)

Todas están marcadas `aplicado`; ninguna quedó pendiente de resolver.

- **Task 1** — Vitest 5 no trae `environmentMatchGlobs`: ambiente por archivo vía pragma `// @vitest-environment jsdom`.
- **Task 4** — Tablas de Better Auth escritas a mano (el paquete `@better-auth/cli` está deprecated y desalineado de versión).
- **Task 4** — `testTimeout` de Vitest subido a 15s (contención de CPU con varias instancias PGlite en paralelo).
- **Task 4** — `agentRules: false` en `next.config.ts` (Next 16 reescribía `CLAUDE.md` en cada `next dev`).
- **Task 5** — `DATABASE_URL` de relleno en el setup de Vitest (módulos que re-exportan `db` a nivel de módulo, sin tocarlo en el test).
- **Task 8** — `src/lib/cn.ts` re-exporta el paquete `cn` de shadcn en vez de duplicar clsx+tailwind-merge (evita pelear la codegen de `shadcn add` en cada plan).
- **Task 8** — Componente `form` de shadcn omitido: en esta versión el registro está vacío (sin `react-hook-form`); los formularios del admin usan `<form action={...}>` de React 19 con Zod en el servidor.
- **Task 8** — Fix a `src/hooks/use-mobile.ts` (generado por shadcn): tenía un error de lint y, en un primer intento de arreglo, un error de hidratación real; la solución final usa `useSyncExternalStore`.
- **Task 8** — `trustedOrigins` de Better Auth incluye el puerto de e2e (3100) para que el login funcione en los tests de Playwright.
- **Fuera de tarea** — se agregó `pnpm typecheck` (`next typegen && tsc --noEmit`): CLAUDE.md lo exige pero el plan nunca pidió crear el script.

## Revisión (Opus)

Verificación inicial en verde. La revisión (`/code-review high`, lectura manual y navegador en 375/1440 px) encontró 10 problemas; todos corregidos con tests. Detalle en `docs/decisions.md` (sección "Revisión del Plan 00").

- **Seguridad (crítico):** el registro con correo era público: cualquiera podía registrarse antes que el dueño de un correo recién agregado y quedarse con esa cuenta de admin. Ahora no hay registro público; los admins entran por **invitación por correo**, Google o el script.
- **Seguridad:** las páginas del admin solo verificaban la sesión en el layout; ahora cada página llama `requireAdmin()`. Quitar un correo cierra sus sesiones. Límite de intentos de login guardado en la BD.
- **Pedido tuyo:** recuperar contraseña y Google quedaron listos "para configurar": correos por consola en desarrollo, Resend en producción, y el botón de Google aparece solo con credenciales. Guía en `docs/configuracion-externa.md`.
- **Papelera:** su diseño no habría visto a los peleadores del Plan 02; ahora usa un registro único, muestra el nombre del elemento y pagina.
- **Historial:** paginado y muestra quién hizo cada acción (incluye inicios de sesión).
- **E2E:** usaban tu BD de desarrollo (dejaban un admin con contraseña conocida); ahora tienen BD propia. Tu BD de desarrollo quedó limpia.
- **Reglas de CLAUDE.md:** menú móvil usable con teclado, botones táctiles de 44 px, etiquetas visibles, estados de carga/error, fechas con zona horaria de Chile, footer sin JavaScript, cerrar sesión.
- **Planes siguientes:** `docs/convenciones.md` resume lo construido y cada plan 01–07 lo referencia. Plan 02 (papelera) y 06 (correo, ya hecho) ajustados.

Resultado final: 66 tests unitarios, 13 e2e, lint, typecheck y build en verde.

## Pendientes (para planes siguientes o antes de producción)

- Credenciales de Google y Resend: las creas tú cuando quieras con `docs/configuracion-externa.md`. Sin ellas todo funciona: no aparece el botón de Google y los correos se imprimen en la terminal.
- `BETTER_AUTH_SECRET` y `CRON_SECRET` de `.env` son de desarrollo; se generan reales al desplegar (Plan 07).
- Login en previews de Vercel: anotado como pendiente para el Plan 07 en `docs/decisions.md`.
- Las 8 secciones placeholder del admin y el "Inicio" se llenan en los planes 02–06.

## Comandos para probar

```bash
docker compose up -d
pnpm db:migrate
pnpm create-admin tu@correo.cl "una-clave-segura"
pnpm dev
```

Verificación completa:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

`pnpm test:e2e` necesita Docker Desktop abierto; crea y vacía su propia BD (`guerra_campal_e2e`) y su admin de prueba.

## Qué pantallas mirar

- **`/`** (375 px y 1440 px) — header que se vuelve sólido al bajar y se oculta/reaparece; en móvil, menú ☰: ábrelo y ciérralo con Escape.
- **`/admin/login`** — entra con el admin que creaste con el script. Prueba una clave mala (error junto al campo) y "¿Olvidaste tu contraseña?".
- **`/admin/usuarios`** — "Dar acceso" a otro correo tuyo: en la terminal de `pnpm dev` aparece el correo con el enlace para crear contraseña. Ábrelo, crea la clave y entra con ese correo. En móvil la tabla pasa a tarjetas.
- **`/admin/historial`** — debe mostrar quién dio acceso, el inicio de sesión y la creación de contraseña, con hora de Chile.
- **Sidebar** — "Cerrar sesión" al final; en móvil se abre con el botón de arriba a la izquierda y se cierra al elegir una sección.

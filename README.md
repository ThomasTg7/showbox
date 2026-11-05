# OFL

Copia independiente de Guerra Campal. Ver [guía de OFL](docs/OFL.md) para iniciar la aplicación, acceder al panel y restaurar el respaldo.

**Inicio local:** `docker compose up -d` y `pnpm dev --port 3002`. Sitio en http://localhost:3002; panel en http://admin.localhost:3002. Base propia en puerto 5433.

---

# Guerra Campal

Plataforma web de la promotora de MMA **Guerra Campal** (Chile): sitio público estilo UFC (eventos, cartelera y resultados, peleadores, rankings, noticias, entradas) y un panel de administración propio.

**Stack:** Next.js (App Router) · TypeScript · Postgres + Drizzle · Better Auth · Tailwind · almacenamiento compatible S3. Solo Postgres estándar y S3: se despliega en Vercel o en un VPS propio sin cambiar código.

## Empezar

Requisitos: Node 22, pnpm y Docker Desktop (Postgres local).

```bash
cp .env.example .env        # y revisa los valores
docker compose up -d        # Postgres
pnpm install
pnpm db:migrate
pnpm db:seed                # datos de demostración (solo desarrollo)
pnpm create-admin tu@correo.cl "una-clave-segura"
pnpm dev
```

- Sitio: <http://localhost:3000> · Panel: <http://admin.localhost:3000> (el panel vive en su propio subdominio).

## Verificar

```bash
pnpm test           # unitarias y de integración (Vitest + PGlite)
pnpm lint
pnpm typecheck
pnpm test:e2e       # Playwright (necesita Docker abierto); incluye accesibilidad con axe
pnpm build
pnpm lighthouse     # presupuestos de rendimiento; con `pnpm build && pnpm start` corriendo en :3000
```

## Documentación

| Documento | Para qué |
|---|---|
| [`docs/guia-admin.md`](docs/guia-admin.md) | cómo usar el panel (para la promotora) |
| [`docs/deploy.md`](docs/deploy.md) | publicar en Vercel, paso a paso, y lanzamiento |
| [`docs/vps-migration.md`](docs/vps-migration.md) | pasar a un VPS propio (Docker Compose) |
| [`docs/configuracion-externa.md`](docs/configuracion-externa.md) | Google (login) y Resend (correo) |
| [`docs/superpowers/specs/2026-09-28-guerra-campal-design.md`](docs/superpowers/specs/2026-09-28-guerra-campal-design.md) | especificación |
| [`docs/convenciones.md`](docs/convenciones.md) · [`docs/decisions.md`](docs/decisions.md) | patrones construidos y registro de decisiones |
| [`CLAUDE.md`](CLAUDE.md) · [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | reglas del proyecto y flujo de trabajo por planes |

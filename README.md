# ShowBox Promotions

Plataforma web de la promotora de **boxeo** ShowBox Promotions (Ecuador): sitio público estilo afiche de velada (eventos, cartelera y resultados, boxeadores, rankings, noticias, entradas) y un panel de administración propio con consola para la noche de pelea.

Es una copia independiente de la plataforma de Open Fight Latam (MMA), adaptada a boxeo y a la identidad de ShowBox. Lo que cambió está resumido en [`docs/SHOWBOX.md`](docs/SHOWBOX.md).

**Stack:** Next.js (App Router) · TypeScript · Postgres + Drizzle · Better Auth · Tailwind · almacenamiento compatible S3. Solo Postgres estándar y S3: se despliega en Vercel o en un VPS propio sin cambiar código.

## Verlo en tu computador (guía rápida)

### 1. Requisitos (una sola vez)

- **Node 22** — <https://nodejs.org> (elige la versión 22 LTS).
- **pnpm** — después de instalar Node, en una terminal: `corepack enable` (o `npm install -g pnpm`).
- **Docker Desktop** — <https://www.docker.com/products/docker-desktop/> (levanta la base de datos Postgres). Ábrelo y déjalo corriendo.
- **Git** — <https://git-scm.com>.

### 2. Obtener el proyecto

**Si tienes el archivo `showbox.bundle`** (repositorio git completo, con su historial):

```bash
git clone showbox.bundle showbox
```

```bash
cd showbox
```

**Si ya está en GitHub** (ver «Subirlo a tu GitHub» más abajo):

```bash
git clone https://github.com/TU-USUARIO/showbox.git
```

```bash
cd showbox
```

### 3. Configurar y arrancar

```bash
cp .env.example .env
```

(En Windows con PowerShell: `copy .env.example .env`). No hace falta editar nada para probar en local.

```bash
docker compose up -d
```

```bash
pnpm install
```

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

```bash
pnpm create-admin admin@showbox.test "ShowBox2026!seguro"
```

```bash
pnpm dev --port 3002
```

### 4. Abrir

- **Sitio público:** <http://localhost:3002>
- **Panel de administración:** <http://admin.localhost:3002> — entra con `admin@showbox.test` y la clave `ShowBox2026!seguro` (la que pusiste en `create-admin`).

El seed carga datos de **ejemplo** (boxeadores y veladas ficticias en Quito, la próxima a unas 3 semanas de la fecha en que lo corres) para que todas las pantallas tengan contenido. Para empezar con la base vacía, no corras `pnpm db:seed`.

Para apagar: `Ctrl + C` en la terminal de `pnpm dev` y luego `docker compose down` (los datos se conservan; `docker compose down -v` los borra).

### Subirlo a tu GitHub

1. En <https://github.com/new> crea un repositorio vacío llamado `showbox` (privado, **sin** README ni .gitignore).
2. Dentro de la carpeta del proyecto (la que clonaste del `.bundle`):

```bash
git remote remove origin
```

```bash
git remote add origin https://github.com/TU-USUARIO/showbox.git
```

```bash
git push -u origin main
```

### Problemas comunes

- **`port 5433 is already allocated`**: ya hay otra base en ese puerto. Cierra el otro contenedor (`docker ps`) o cambia el puerto en `docker-compose.yml` y en `DATABASE_URL` del `.env`.
- **`admin.localhost` no abre** (algunos navegadores en Windows): usa Chrome o Edge, o agrega `127.0.0.1 admin.localhost` al archivo `hosts`.
- **Error de conexión a la base al migrar**: revisa que Docker Desktop esté abierto y que `docker compose up -d` haya terminado.

## Verificar

```bash
pnpm test           # unitarias y de integración (Vitest + PGlite)
pnpm lint
pnpm typecheck
pnpm test:e2e       # Playwright (necesita Docker abierto); incluye accesibilidad con axe
pnpm build
```

## Documentación

| Documento | Para qué |
|---|---|
| [`docs/SHOWBOX.md`](docs/SHOWBOX.md) | identidad ShowBox y adaptación a boxeo: qué cambió respecto de la plataforma original |
| [`docs/guia-admin.md`](docs/guia-admin.md) | cómo usar el panel (para la promotora) |
| [`docs/deploy.md`](docs/deploy.md) | publicar en Vercel, paso a paso, y lanzamiento |
| [`docs/vps-migration.md`](docs/vps-migration.md) | pasar a un VPS propio (Docker Compose) |
| [`docs/configuracion-externa.md`](docs/configuracion-externa.md) | Google (login) y Resend (correo) |
| [`docs/convenciones.md`](docs/convenciones.md) · [`docs/decisions.md`](docs/decisions.md) | patrones construidos y registro de decisiones |
| [`CLAUDE.md`](CLAUDE.md) · [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | reglas del proyecto y flujo de trabajo |

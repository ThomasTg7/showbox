# syntax=docker/dockerfile:1.7
# Imagen de producción de ShowBox Promotions (Next.js `standalone`). El contexto de build es la RAÍZ del repositorio:
#   docker compose -f deploy/docker-compose.prod.yml build app
# Guía completa: docs/vps-migration.md

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ─── Dependencias ─────────────────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# ─── Herramientas: migraciones y primer administrador ─────────────────────────────────────────────
#   docker compose -f deploy/docker-compose.prod.yml run --rm migrate                      # aplica las migraciones
#   docker compose -f deploy/docker-compose.prod.yml run --rm migrate pnpm create-admin correo@dominio.cl "clave"
FROM deps AS migrate
COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src
CMD ["pnpm", "db:migrate"]

# ─── Build ────────────────────────────────────────────────────────────────────────────────────────
# `next build` genera estáticas la home y otras páginas leyendo la base: tiene que estar migrada y accesible AHORA (en el
# VPS, el Postgres del compose publicado en 127.0.0.1; el build usa la red del servidor, `network: host` en el compose). Las variables
# viajan como *secreto de build* (no quedan en las capas de la imagen): el archivo `deploy/.env`. `BUILD_DATABASE_URL`
# es la dirección de la base vista desde el build; en tiempo de ejecución la app usa `DATABASE_URL` (dentro de la red).
FROM deps AS build
COPY . .
RUN --mount=type=secret,id=buildenv \
    set -a && . /run/secrets/buildenv && set +a \
    && DATABASE_URL="${BUILD_DATABASE_URL:?Falta BUILD_DATABASE_URL en deploy/.env}" pnpm build

# ─── Imagen final ─────────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/favicon.ico').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]

#!/bin/sh
# Solo corre la PRIMERA vez que se crea el volumen de Postgres. Umami (analítica) usa su propia base.
# Si el volumen ya existía: docker compose -f deploy/docker-compose.prod.yml exec postgres createdb -U "$POSTGRES_USER" umami
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE umami"

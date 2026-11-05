#!/bin/sh
# Llama a la limpieza de la app con el secreto (CRON_SECRET viene del entorno del servicio `cron`).
set -eu
BODY=$(wget -qO- --timeout=120 --header="Authorization: Bearer ${CRON_SECRET:?falta CRON_SECRET}" http://app:3000/api/cron/purge)
echo "$(date -u +%FT%TZ) purge: ${BODY}"

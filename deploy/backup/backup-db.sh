#!/bin/sh
# Copia de la base (pg_dump, formato custom) en /backups/db; borra las de más de BACKUP_KEEP_DAYS días.
# Corre una al arrancar y luego una cada 24 h; con `--once`, solo una (para probarla o antes de una actualización).
# Restaurar: pg_restore --clean --if-exists -d guerra_campal <archivo> (ver docs/vps-migration.md).
set -eu

backup_once() {
  mkdir -p /backups/db
  file="/backups/db/${POSTGRES_DB:?falta POSTGRES_DB}-$(date -u +%Y%m%d-%H%M%S).dump"
  # Se escribe a un temporal: una copia cortada a la mitad nunca queda con el nombre de una buena. Los errores se revisan a
  # mano: dentro de `backup_once || …` el shell ignora `set -e`.
  if ! PGPASSWORD="${POSTGRES_PASSWORD:?falta POSTGRES_PASSWORD}" pg_dump -h "${PGHOST:-postgres}" -U "${POSTGRES_USER:-postgres}" -Fc "$POSTGRES_DB" > "$file.partial"; then
    rm -f "$file.partial"
    return 1
  fi
  mv "$file.partial" "$file" || return 1
  find /backups/db -name '*.dump' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
  echo "$(date -u +%FT%TZ) backup-db: $file ($(du -h "$file" | cut -f1))"
}

if [ "${1:-}" = "--once" ]; then
  backup_once
  exit 0
fi

while true; do
  backup_once || echo "$(date -u +%FT%TZ) backup-db: FALLÓ (se reintenta en 24 h)" >&2
  sleep 86400
done

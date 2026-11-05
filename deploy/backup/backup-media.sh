#!/bin/sh
# Copia de las imágenes del bucket de MinIO en /backups/media (solo agrega y actualiza: una imagen borrada del bucket se
# conserva en la copia). Corre una al arrancar y luego una cada 24 h; con `--once`, solo una.
set -eu

backup_once() {
  mkdir -p /backups/media
  # Errores revisados a mano: dentro de `backup_once || …` el shell ignora `set -e`.
  mc alias set local "${MINIO_URL:-http://minio:9000}" "${MINIO_ROOT_USER:?falta MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD:?falta MINIO_ROOT_PASSWORD}" > /dev/null || return 1
  mc mirror --overwrite --quiet "local/${S3_BUCKET:-guerra-campal}" /backups/media > /dev/null || return 1
  echo "$(date -u +%FT%TZ) backup-media: $(du -sh /backups/media | cut -f1) en /backups/media"
}

if [ "${1:-}" = "--once" ]; then
  backup_once
  exit 0
fi

while true; do
  backup_once || echo "$(date -u +%FT%TZ) backup-media: FALLÓ (se reintenta en 24 h)" >&2
  sleep 86400
done

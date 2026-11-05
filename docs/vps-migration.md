# Migrar a un VPS propio

Cómo pasar Guerra Campal de Vercel + Neon/Supabase + R2 a **un servidor propio** (Docker Compose). Nada del código depende de un proveedor: se cambia configuración, no programa. Los archivos están en [`deploy/`](../deploy):

| Archivo | Para qué |
|---|---|
| `deploy/Dockerfile` | imagen de la app (Next.js `standalone`) y de las herramientas (`migrate`) |
| `deploy/docker-compose.prod.yml` | app, Postgres 17, MinIO, Umami, Caddy (HTTPS), el cron diario y las copias diarias |
| `deploy/Caddyfile` | HTTPS para `guerracampal.cl` **y** `admin.guerracampal.cl` hacia la misma app, imágenes y estadísticas |
| `deploy/cron/` | limpieza diaria (`/api/cron/purge` con `CRON_SECRET`) |
| `deploy/backup/` | copias diarias de la base y de las imágenes en `deploy/backups/` (ver «Copias») |
| `deploy/env.example` | variables del servidor (copia a `deploy/.env`) |

## 1. Qué necesitas

- Un VPS Linux con **2 GB de RAM o más** y 20 GB de disco (el build de la imagen necesita memoria), IP fija y los puertos **80 y 443** abiertos.
- **Docker** y el plugin **Compose v2** (`docker compose version`).
- Acceso al DNS del dominio.
- El código del repositorio en el servidor (`git clone`).

## 2. Probar en tu PC antes de tocar el servidor

Sirve para comprobar que todo levanta (imágenes desde MinIO, panel, cron). Sin dominios ni certificados: Caddy responde en `http://*.localhost:8080` (Chrome y Firefox resuelven `*.localhost` solos).

1. Crea `deploy/.env` desde `deploy/env.example` y cambia **estos** valores:
   ```bash
   SITE_HOST=http://localhost:8080
   ADMIN_HOST=http://admin.localhost:8080
   WWW_HOST=http://www.localhost:8080
   MEDIA_HOST=http://media.localhost:8080
   STATS_HOST=http://stats.localhost:8080
   SITE_URL=http://localhost:8080
   ADMIN_URL=http://admin.localhost:8080
   MEDIA_HOST_ALIAS=media.localhost
   S3_ENDPOINT=http://media.localhost:8080
   S3_PUBLIC_URL=http://media.localhost:8080/guerra-campal
   MINIO_CORS_ORIGINS=http://localhost:8080,http://admin.localhost:8080
   MAIL_DRIVER=console
   CADDY_HTTP_PORT=8080
   CADDY_HTTPS_PORT=8443
   POSTGRES_PORT=5433
   BUILD_DATABASE_URL=postgres://postgres:<POSTGRES_PASSWORD>@127.0.0.1:5433/guerra_campal
   NEXT_PUBLIC_MODEL_BASE_URL=
   ```
   (Y contraseñas cualquiera. `POSTGRES_PASSWORD` debe coincidir con la de `BUILD_DATABASE_URL`. El puerto `5433` evita chocar con el Postgres de desarrollo del 5432.)
2. Levanta y construye (la primera vez tarda varios minutos):
   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d postgres minio minio-setup
   docker compose -f deploy/docker-compose.prod.yml run --rm migrate
   docker compose -f deploy/docker-compose.prod.yml build app
   docker compose -f deploy/docker-compose.prod.yml up -d
   docker compose -f deploy/docker-compose.prod.yml run --rm migrate pnpm create-admin yo@ejemplo.cl "una-clave-segura"
   ```
3. Verifica: `http://localhost:8080` carga la home; entra a `http://admin.localhost:8080/login`, sube una foto a un peleador y comprueba (pestaña *Red* del navegador) que la imagen viene de `media.localhost:8080/guerra-campal/…`, o sea de MinIO.
4. Apaga y limpia: `docker compose -f deploy/docker-compose.prod.yml down -v` (borra los datos de la prueba).

## 3. En el servidor, la primera vez (sitio nuevo, sin datos)

1. **DNS:** un registro `A` (y `AAAA` si hay IPv6) hacia la IP del servidor para `guerracampal.cl`, `www`, `admin`, `media` y `stats`.
2. `cp deploy/env.example deploy/.env` y completa **todo**: contraseñas largas (letras y números, para no romper una URL), `BETTER_AUTH_SECRET`, `CRON_SECRET`, `UMAMI_APP_SECRET` (`openssl rand -hex 32`), `RESEND_API_KEY`, `MAIL_FROM`, Google (opcional). `chmod 600 deploy/.env`.
3. Orden (cada paso depende del anterior; **la base tiene que existir y estar migrada antes de construir la app**, porque la home y otras páginas se generan leyendo la base):
   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d postgres minio minio-setup
   docker compose -f deploy/docker-compose.prod.yml run --rm migrate
   docker compose -f deploy/docker-compose.prod.yml build app
   docker compose -f deploy/docker-compose.prod.yml up -d
   docker compose -f deploy/docker-compose.prod.yml run --rm migrate pnpm create-admin correo@dominio.cl "una-clave-segura"
   ```
4. **Modelo de «Quitar fondo»:** sube los tres archivos de [`Xenova/modnet`](https://huggingface.co/Xenova/modnet/tree/main) al bucket, con `mc` dentro de la red del compose:
   ```bash
   docker run --rm --network guerracampal-prod_default -v "$PWD/modnet:/modnet:ro" --entrypoint /bin/sh cgr.dev/chainguard/minio-client:latest-dev -c \
     'mc alias set local http://minio:9000 "$USER" "$PASS" && mc cp --recursive /modnet/ local/guerra-campal/models/Xenova/modnet/'
   ```
   (con `USER`/`PASS` = `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`, y `./modnet/` con `config.json`, `preprocessor_config.json` y `onnx/model.onnx`). `NEXT_PUBLIC_MODEL_BASE_URL` ya apunta a `https://media.guerracampal.cl/guerra-campal/models`; como se incluye al construir, si lo cambias vuelve a construir la app.
5. **Escritura condicional:** repite lo de [`deploy.md`](deploy.md#12-bucket-de-imágenes-cloudflare-r2--15-min) paso 6: el segundo `PUT` a una URL firmada ya usada debe dar **412** (MinIO reciente lo respeta; si no, anótalo en `docs/decisions.md`).
6. **Cron:** el servicio `cron` ya llama a `/api/cron/purge` cada día a las 04:00. Compruébalo: `docker compose -f deploy/docker-compose.prod.yml logs cron` (tras la primera ejecución) y `curl -i https://guerracampal.cl/api/cron/purge` → **401**.
7. **Analítica (opcional):** entra a `https://stats.guerracampal.cl` (usuario `admin`, contraseña `umami`: **cámbiala ya**), crea el sitio y pon su id en `UMAMI_WEBSITE_ID` + `ANALYTICS_PROVIDER=umami`; reconstruye la app (`build app` y `up -d app`).

## 4. Migrar desde Vercel + Neon/Supabase + R2 (sitio ya publicado)

Ensayo primero con los pasos 3.1–3.3 sobre el servidor y un dominio de prueba, y recién después la mudanza real. Idealmente en un horario de poco movimiento.

1. **Baja el TTL del DNS** (a 60–300 s) un día antes.
2. **Congela las escrituras** (avísale a la promotora que no edite hasta terminar), o hazlo cuando no haya evento.
3. **Base de datos:**
   ```bash
   # en tu PC (o donde tengas pg_dump 17):
   pg_dump --format=custom --no-owner --no-acl "<DATABASE_URL de Neon/Supabase>" -f guerra_campal.dump
   scp guerra_campal.dump usuario@servidor:~/
   # en el servidor, con los servicios de la sección 3 ya arriba y SIN datos:
   docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
     pg_restore --no-owner --clean --if-exists -U postgres -d guerra_campal < ~/guerra_campal.dump
   docker compose -f deploy/docker-compose.prod.yml run --rm migrate      # por si el dump es de una versión anterior
   ```
4. **Imágenes: R2 → MinIO** con [rclone](https://rclone.org). Configura dos remotos (`rclone config`): `r2` (S3, proveedor Cloudflare, endpoint `https://<account-id>.r2.cloudflarestorage.com`) y `minio` (S3, proveedor Minio, endpoint `https://media.guerracampal.cl`, con las credenciales de MinIO):
   ```bash
   rclone sync r2:guerra-campal minio:guerra-campal --progress --checksum
   ```
   Incluye `models/Xenova/modnet/…`. (Repite el `sync` justo antes del corte para traer lo último.)
5. **Construye y levanta** la app con `deploy/.env` (sección 3.3). El **mismo `BETTER_AUTH_SECRET`** conserva las sesiones abiertas; uno nuevo las cierra (hay que volver a ingresar).
6. **Prueba con `hosts`**: apunta tu PC al servidor editando el archivo `hosts` (`<IP> guerracampal.cl admin.guerracampal.cl media.guerracampal.cl`) y recorre el sitio y el panel antes de cambiar el DNS público. (Caddy pedirá los certificados solo cuando el DNS ya apunte al servidor: para esta prueba, usa el mismo paso en horario de cambio.)
7. **Corte:** repite el `pg_dump`/`pg_restore` y el `rclone sync` (cambios de última hora), cambia el DNS a la IP del VPS y espera a que propague. Caddy obtiene los certificados al primer acceso.
8. **Variables que cambian respecto a Vercel** (ya están en `deploy/.env`): `DATABASE_URL` (dentro de la red del compose), `STORAGE_DRIVER=s3` con `S3_ENDPOINT`/`S3_PUBLIC_URL` de MinIO y las credenciales de MinIO; `SITE_URL`/`ADMIN_URL` no cambian si el dominio es el mismo. En Google Cloud y Resend no hay nada que tocar si el dominio es el mismo.
9. **Vercel** queda apagado pero a mano unos días por si hace falta volver atrás (el DNS vuelve a su valor anterior).

## 5. Operación diaria

| Tarea | Comando |
|---|---|
| Ver el estado | `docker compose -f deploy/docker-compose.prod.yml ps` |
| Registros de la app | `docker compose -f deploy/docker-compose.prod.yml logs -f app` |
| **Actualizar el sitio** (código nuevo) | `git pull && docker compose -f deploy/docker-compose.prod.yml run --rm migrate && docker compose -f deploy/docker-compose.prod.yml build app && docker compose -f deploy/docker-compose.prod.yml up -d app` |
| Reiniciar todo | `docker compose -f deploy/docker-compose.prod.yml restart` |
| Copia de la base **ahora** (p. ej. antes de actualizar) | `docker compose -f deploy/docker-compose.prod.yml exec backup-db sh /usr/local/bin/backup-db.sh --once` |
| Copia de las imágenes ahora | `docker compose -f deploy/docker-compose.prod.yml exec backup-media sh /usr/local/bin/backup-media.sh --once` |
| Ver las copias | `docker compose -f deploy/docker-compose.prod.yml logs backup-db backup-media` y `ls deploy/backups/db` |
| Restaurar la base | `docker compose -f deploy/docker-compose.prod.yml stop app` → `docker compose -f deploy/docker-compose.prod.yml exec -T postgres pg_restore -U postgres --clean --if-exists -d guerra_campal < deploy/backups/db/<archivo>.dump` → `docker compose -f deploy/docker-compose.prod.yml start app` |

### Copias

- **Automáticas en el servidor:** `backup-db` guarda un `pg_dump` de la base en `BACKUP_DIR/db` (por defecto `deploy/backups/db`) al arrancar y luego cada 24 h, y borra las de más de `BACKUP_KEEP_DAYS` días (14). `backup-media` copia el bucket de imágenes a `BACKUP_DIR/media` con la misma frecuencia (solo agrega y actualiza: una imagen borrada del bucket sigue en la copia). Un dump que falla no deja archivo a medias y se reintenta al día siguiente (queda en los registros).
- **Fuera del servidor (tú):** las copias del propio servidor no sirven si se pierde el servidor. Sincroniza `deploy/backups/` a otro lugar con un `cron` del sistema, por ejemplo `rclone sync /ruta/al/repo/deploy/backups remoto:guerracampal-copias` una vez al día (rclone con Backblaze B2, Google Drive, otro servidor por SFTP…). Prueba restaurar una copia en tu PC cada tanto (`pg_restore --list <archivo>` muestra su contenido).
- Mantén el sistema operativo y las imágenes de Docker al día (`docker compose pull` para Postgres, MinIO, Caddy y Umami; la app se reconstruye).

## 6. Seguridad

- **El puerto de Next (3000) no se publica**: todo entra por Caddy, que **reemplaza** `X-Forwarded-For` con la IP real. El límite de 5 envíos por IP de «Quiero pelear» y «Patrocinar» lee la primera dirección de ese encabezado y Next no la pisa: si se expusiera `next start` directo, o un proxy agregara la dirección del cliente al final (`$proxy_add_x_forwarded_for` de nginx), cualquiera podría falsearla (ver `docs/decisions.md` → «Revisión Plan 06»). Con una CDN delante (Cloudflare), declárala en el Caddyfile con `trusted_proxies` y usa `{client_ip}` en `header_up X-Forwarded-For`.
- Postgres solo escucha en `127.0.0.1`; el panel de MinIO (`:9001`) no se publica (si lo necesitas, un túnel SSH).
- `deploy/.env` con permisos `600`, fuera de git. Contraseñas largas y distintas.
- Firewall: solo 22 (SSH), 80 y 443.

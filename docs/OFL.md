# OFL — copia independiente de Guerra Campal

Creada el 11 de octubre de 2026 desde la carpeta local GuerraCampal. Conserva frontend, backend, panel, código, historial Git, documentación, migraciones, pruebas y archivos locales de imágenes. El diseño público y del panel corresponde a Open Fight Latam. Los datos y fotos de Guerra Campal se conservan como contenido heredado de vista previa.

## Usar la copia

Desde esta carpeta:

```powershell
docker compose up -d
pnpm install --frozen-lockfile
pnpm dev --port 3002
```

- Sitio: http://localhost:3002
- Panel: http://admin.localhost:3002
- Postgres propio: puerto 5433, base `ofl`, volumen `ofl_postgres-data`.
- Pruebas de navegador: base separada `ofl_e2e` en el mismo Postgres de OFL.
- Fotos: `.storage/`, incluidos originales y variantes; recursos públicos: `public/`.

La base inicial fue restaurada desde la base local `guerra_campal`: 13 peleadores, 5 eventos, 10 noticias y 31 registros de medios. Los usuarios existentes se conservan; los secretos de autenticación de OFL son nuevos, por lo que hay que volver a iniciar sesión.

No ejecutar `pnpm db:seed` sobre esta base: ya contiene la copia de los datos.

## Respaldo y configuración

`deploy/backups/db/guerra-campal-20261011.dump` contiene el respaldo inicial completo de la base local, incluidas las migraciones. Para restaurarlo en una base vacía de OFL:

```powershell
docker compose up -d
docker compose cp deploy/backups/db/guerra-campal-20261011.dump postgres:/tmp/ofl-initial.dump
docker compose exec -T postgres pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d ofl /tmp/ofl-initial.dump
```

Las configuraciones originales `.env`, `.env.demo` y `.env.vercel` están preservadas en `deploy/backups/source-config/`, excluido de Git. Son respaldos privados: algunas apuntan a servicios de Guerra Campal. OFL usa exclusivamente el nuevo `.env` local, su propia base y sus fotos locales; correo en consola y Google sin configurar.

Esta copia no incluye una exportación de la base remota de demostración ni del bucket remoto: conserva las configuraciones para localizarlos, pero los datos restaurados y las fotos verificadas son los de la instalación local.

El historial Git se conserva en las ramas de OFL; `origin` apunta al repositorio privado `ThomasTg7/ofl`. Las guías heredadas de despliegue mantienen referencias a Guerra Campal; usar los servicios de OFL descritos abajo.

## Publicación de OFL — 12 de octubre de 2026

- Repositorio privado: https://github.com/ThomasTg7/ofl.
- Proyecto Vercel: `thomas-agv/ofl`, conectado a la rama de producción `codex/ofl-redesign`.
- Sitio: https://openfightlatam.vercel.app.
- Panel: https://openfightlatam-admin.vercel.app.
- Postgres independiente: Neon `ofl-db`, plan gratuito, región São Paulo. La aplicación sigue usando Postgres estándar mediante `DATABASE_URL`, sin SDK del proveedor.
- Imágenes: bucket R2 `ofl`, clase Standard. URL temporal: https://pub-35e7283a3f644cebb82fe5939db52629.r2.dev.

La base remota conserva el contenido de la instalación OFL: 13 peleadores, 5 eventos, 10 noticias y 44 registros de medios. No se copiaron las cuentas, sesiones, auditorías ni mensajes privados de la instalación local. El administrador de producción tiene credenciales propias, guardadas únicamente en `.superpowers/deploy/admin-access.txt`, excluido de Git y Vercel.

Se prepararon 78 objetos de medios activos (originales y variantes) y los tres archivos del modelo `Xenova/modnet` usado para quitar fondo: 81 objetos, 52.943.256 bytes (aproximadamente 53 MB). Sumando los 240,99 MB observados en los otros buckets de la cuenta, el almacenamiento queda alrededor de 294 MB, por debajo de los 10 GB incluidos. Esta cifra corresponde al contenido inicial, no impone un límite automático a futuras cargas.

El token `ofl-vercel` tiene permiso Object Read & Write únicamente sobre `ofl`. Las credenciales S3, `BETTER_AUTH_SECRET` y `CRON_SECRET` están en las variables sensibles de producción de Vercel. CORS permite GET, HEAD y PUT desde los dos orígenes de OFL, con `Content-Type` e `If-None-Match`; las variantes se almacenan con caché inmutable y los originales migrados con `no-store`.

Al reeditar, el panel descarga el original con CORS y `cache: reload`, y abre una URL local de sus bytes. Esto evita reutilizar una respuesta que el navegador hubiera guardado al mostrar la imagen sin CORS; las vistas previas y quitar fondo usan esos mismos bytes. La URL local se libera al guardar, cancelar o desmontar el campo.

Vercel usa Node 22, `pnpm install --frozen-lockfile` y `pnpm vercel-build` (migraciones antes del build). `.vercelignore` excluye variables locales, respaldos, almacenamiento local, logs y archivos privados de trabajo del paquete de despliegue.

El correo permanece en modo consola, Google y analítica sin configurar. Los formularios guardan las solicitudes en el panel; todavía no se envían avisos ni correos de recuperación. Antes de un lanzamiento con dominio propio, configurar el correo y conectar un dominio de medios a R2: `r2.dev` tiene límites de tráfico y Cloudflare lo reserva para uso de desarrollo. Actualizar `SITE_URL`, `ADMIN_URL`, `S3_PUBLIC_URL`, `NEXT_PUBLIC_MODEL_BASE_URL` y CORS al cambiar los dominios.

Para desplegar cambios, hacer commit y push a `codex/ofl-redesign`; Vercel construye la rama automáticamente. No ejecutar el seed en la base remota.

## Cambiar la promotora

La identidad se define en `src/domain/brand.ts` y en el spec aprobado `docs/superpowers/specs/2026-10-11-ofl-redesign-design.md`. El logo suministrado, negro/blanco, rojo y violeta se aplican a todo el sitio y al panel. Los contenidos, afiches, nombres de eventos y redes guardadas siguen siendo los de la copia; se pueden sustituir desde el panel cuando estén disponibles los de OFL. El enlace oficial de Instagram de OFL aparece por separado.

Rama de trabajo del rediseño: `codex/ofl-redesign`. Las reglas funcionales heredadas siguen vigentes; la estética OFL sustituye la paleta amarilla y la maqueta antigua.

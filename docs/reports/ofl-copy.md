# Verificación de la copia OFL — 2026-10-11

## Alcance

Copia de la instalación local de Guerra Campal en `C:\Users\thoma\Documents\Proyectos\OFL`. Código de aplicación sin cambios. Configuración de Postgres, secretos y direcciones locales independientes. Historial Git conservado; remoto original retirado. Ver `docs/OFL.md`.

## Integridad

- SHA-256 idéntico en 821 archivos de `src`, `public`, `.storage`, `maqueta`, `drizzle`, `e2e` y `scripts`: 14.196.901 bytes verificados.
- 54 archivos de medios locales, 10.409.634 bytes, incluidos originales y variantes.
- 33 tablas y 248 filas verificadas comparando el contenido completo de cada fila con la base original, incluidas las migraciones.
- Base restaurada: 13 peleadores, 5 eventos, 10 noticias y 31 registros de medios (23 listos y 8 pendientes, como en el original).
- Todos los archivos referenciados por los medios listos existen en la copia.
- `.env`, almacenamiento y respaldos privados excluidos de Git.
- El repositorio original conserva su estado previo: únicamente `.claude/` y `AGENTS.md` sin seguimiento.

## Comprobaciones

- `pnpm install --frozen-lockfile`: pasó.
- `pnpm lint`: pasó.
- `pnpm typecheck`: pasó.
- `pnpm test --maxWorkers=1`: 145 archivos y 1.191 pruebas pasaron (479,45 segundos).
- `pnpm test:e2e e2e/home.spec.ts e2e/admin-auth.spec.ts e2e/media.spec.ts --workers=1`: 31 pruebas pasaron. Incluye autenticación, carga y edición de fotos, sanitización SVG y anchos 320, 375, 768 y 1440 px.
- Instalación con los datos restaurados, en puerto 3002: portada HTTP 200, un solo h1, cero desbordamiento horizontal a 375 y 1440 px; login del panel HTTP 200 y botón de acceso visible.

Los registros y capturas de la verificación están en `deploy/backups/`, fuera de Git.

## Incidencias del entorno

La primera ejecución de las pruebas unitarias agotó la memoria al usar varios procesos simultáneos. Se repitió con un solo worker, sin modificar la aplicación. Las primeras pruebas de navegador no pudieron arrancar por falta de la versión de Chromium requerida; se instaló con `pnpm exec playwright install chromium` y las 31 pruebas pasaron al repetirlas.

## Límites de la copia

Se copiaron los archivos y datos locales. Las configuraciones remotas de demostración se preservaron como respaldo privado, pero no se exportaron la base de datos ni el bucket remotos. La marca y el diseño visibles todavía corresponden a Guerra Campal. No se copian carpetas generadas de compilación ni resultados antiguos; las dependencias se instalaron de nuevo desde el lockfile.

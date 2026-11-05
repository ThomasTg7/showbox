# OFL — Nombres y contenido

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

- Eventos «OFL 1–5» y noticias como «Cartelera completa de OFL 5 confirmada», «Resumen de OFL 4» y «Entradas para OFL 5». Cuerpos de noticias, ejemplos del panel y seeds actualizados.
- Slugs públicos actualizados a `ofl`. El proxy redirige enlaces antiguos con 308 y conserva las query strings y las páginas de pelea; respeta primero la separación entre sitio y admin.
- Migración local realizada con `pnpm exec tsx --env-file-if-exists=.env scripts/rebrand-ofl.ts`. En instalaciones existentes, ejecutar antes de volver a sembrar datos, y reiniciar el servidor para renovar su caché. Actualiza textos existentes en una transacción, conserva IDs/carteleras/relaciones/archivos y registra antes/después por entidad en auditoría. Las consultas de mantenimiento son operaciones por conjunto; no agrega consultas públicas.
- Reintentos idempotentes. Colisiones de slug revierten toda la transacción. Reversión: el mismo comando con `--rollback`; solo restaura si el contenido sigue coincidiendo con lo migrado y rechaza sobrescribir ediciones posteriores. Para una reversión completa de versión, restituir también código y seeds del commit anterior y reiniciar el servidor.
- Los documentos del proyecto anteriores se mantienen como historia. Se actualizan el spec OFL y los ejemplos de configuración vigentes.
- Primer test de nombres del seed falló con los nombres anteriores; luego pasó. Las pruebas de migración verifican integridad de IDs, carteleras y relaciones, textos enriquecidos, enlaces reales externos, idempotencia, reversión y rechazo de colisiones.
- Revisión local a 375/1440 px: eventos y noticias sin nombres antiguos en sus textos. Capturas en `.superpowers/ofl-champion-preview/content-*.png`. El servidor queda en `http://localhost:3002`.

- `pnpm test --maxWorkers=2`: 151 archivos, 1.204 pruebas en verde.
- `pnpm typecheck`: en verde.
- `pnpm lint`: en verde.
- E2e de eventos, noticias, relaciones, historial, entradas, SEO y contenido OFL: 69 escenarios cubiertos. Primera corrida: 68 pasaron; falló la comprobación de un encabezado `Location` relativo en el test nuevo. Corregida la resolución del encabezado contra la URL base, `pnpm test:e2e e2e/ofl-content.spec.ts --workers=1` pasó sus 3 pruebas (375/1440 px y redirecciones antiguas, incluyendo pelea y query).
- Lint se repitió tras una carrera de lectura con la carpeta temporal eliminada por Playwright al iniciar; sin cambio de código por ese fallo de infraestructura.

## Incidencia del servidor local: detalle de peleas

- El servidor de 3002 devolvía un 404 genérico para detalles de pelea que existían en la base. Su inventario generado de rutas omitía `/eventos/[slug]/peleas/[boutId]` y otras rutas anidadas, aunque sus archivos existían; el servidor independiente de e2e sí las registraba.
- Se reconstruyó la caché `.next/dev` y se reinició únicamente el servidor OFL de 3002. Su inventario vuelve a incluir las rutas omitidas. No requirió cambios en URLs, datos o código de producto.
- Verificación en el servidor real: clic desde la cartelera de OFL 1, 3 y 5 a 375/1440 px; los 21 detalles enlazados de OFL 1–5 responden 200; una pelea inexistente sigue devolviendo 404. Servidor dejado activo en `http://localhost:3002`.

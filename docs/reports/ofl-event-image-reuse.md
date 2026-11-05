# OFL — Selección de portada móvil y reutilización del afiche

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

## Análisis

- La base local de OFL 5 tiene tres medios distintos: portada horizontal (1672×941), móvil (1122×1402) y afiche (1122×1402).
- A 375 px, `HTMLImageElement.currentSrc` usa la variante WebP de la portada móvil; a 1440 px usa la horizontal. Se revisaron capturas reales de ambos tamaños. El encuadre `object-cover` recorta la imagen vertical para llenar una portada más alta que 4:5; se conserva ese encuadre y el punto de enfoque configurable.
- Había un fallo distinto: la condición exterior comprobaba únicamente `heroMedia`. Si faltaba la horizontal, no se renderizaba la móvil aunque estuviera configurada.

## Cambios

- El `picture` funciona con la imagen móvil sola. En escritorio queda oculto y usa una imagen transparente embebida, evitando descargar el archivo móvil para un escenario que no lo muestra. El escenario de marca/careo se conserva en escritorio si falta la horizontal.
- Admin → Eventos → Imágenes: reutilizar afiche como móvil o móvil como afiche. Los botones se deshabilitan si no existe la imagen de origen; las selecciones y vistas previas se actualizan antes de guardar.
- Los campos compatibles comparten el mismo id y variantes, sin volver a subir o recortar. Quitar la selección de uno no quita la del otro. Reeditar un medio compartido actualiza las dos vistas previas.
- Compatibilidad limitada a los dos tipos 4:5; siguen rechazándose medios inexistentes, no terminados, eliminados o de otros tipos. La prueba de dominio comprueba que sus especificaciones de procesado sean idénticas.
- Sin cambios de datos locales ni migraciones. Se mantienen las actions de evento y medio protegidas, su auditoría y revalidación.

## Verificación

- TDD: cuatro pruebas fallaron antes de implementar (móvil sin horizontal, ambos botones y guardado de un medio en los dos campos); después pasaron las 52 pruebas enfocadas de portada, formulario, servicio y especificaciones.
- `pnpm test --maxWorkers=2`: 153 archivos y 1.213 pruebas en verde.
- `pnpm lint` y `pnpm typecheck`: en verde.
- Playwright: 6 pruebas en verde (reutilización en ambas direcciones a 375/1440 px y botones de portada a 320/375/430/1440 px). Se comprobó el archivo seleccionado mediante `currentSrc` también a 767/768 px, la portada móvil sin horizontal y la persistencia de ambos campos después de guardar y recargar.
- Capturas revisadas del panel a 375/1440 px y de la portada móvil independiente; sin desbordamiento horizontal y botones de reutilización de al menos 44 px.
- Servidor local conservado en `http://localhost:3002`. Evento OFL 5 y detalle de pelea responden HTTP 200.

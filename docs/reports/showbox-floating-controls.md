# Navegación y entradas con ocultación por reposo

La barra de entradas de escritorio queda a 4 px del borde inferior (antes 16 px). En móvil conserva su anclaje al pie y zona segura.

El navbar y la barra comparten un ciclo de actividad de 4 segundos. Se ocultan en reposo y vuelven con scroll, movimiento del cursor, toque, teclado o recuperación del foco de la ventana. Mover el cursor no actualiza el ciclo más de una vez cada 150 ms. Un menú abierto, el cursor sobre un control o el foco dentro de una barra pausan la ocultación; el ciclo se reanuda al terminar esa interacción. Un único conjunto de listeners y un timer sirven a ambos componentes; el último desmontaje los limpia.

El navbar ahora está disponible inicialmente también en la portada, en lugar de permanecer oculto durante toda ella. La barra de entradas mantiene su condición independiente: solo aparece cuando la portada ya quedó arriba. Los controles ocultos conservan `inert`; Tab permite recuperarlos. Las transiciones existentes de transform/opacity respetan movimiento reducido.

## Verificación

- Regresiones reproducidas antes del cambio: separación inferior de 16 px y ausencia de ocultación por reposo.
- `pnpm test`: 153 archivos, 1.207 pruebas correctas. Incluye sincronización entre controles, reactivación, foco, menú abierto y limpieza del timer.
- `pnpm lint` y `pnpm typecheck`: correctos.
- 29 e2e correctos: reposo y reaparición en 375/1440 px, navegación con teclado, hover/foco, menú móvil, portadas integradas, botones, layout y anclaje inferior.
- Revisión real en Chrome: ambas barras ocultas en reposo; reaparición y distancia inferior medida de 4 px; apertura del menú móvil con teclado y cierre con Escape.
- Evidencias: `.local-runtime/outputs/showbox-entradas-borde-inferior-pc.jpg`, `.local-runtime/outputs/showbox-controles-en-reposo-pc.jpg` y `.local-runtime/outputs/showbox-menu-interactivo-movil.jpg`.

Sin cambios de datos, esquema, autenticación, dependencias o destinos de entradas.

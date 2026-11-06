# Navegación y entradas con ocultación por reposo

La barra de entradas queda pegada al borde inferior en todos los anchos: `bottom: 0`, sin separación en PC ni móvil. Conserva la zona segura móvil.

El navbar se oculta al bajar y reaparece al subir. Acumula un margen de 8 px para ignorar pequeños temblores del scroll y se muestra al volver a los primeros 24 px de la página. Los movimientos de un dedo durante el arrastre no lo recuperan accidentalmente. Mantiene su ocultación por reposo a los 4 segundos.

El estado de bajada permanece activo al mover el cursor, tocar la página o recuperar el foco de la ventana. La interacción con entradas tampoco lo cancela: cada barra tiene su propia pausa de hover/foco. Tab y Escape permiten recuperar la navegación de forma deliberada con teclado.

Entradas se muestra después de pasar la portada y se oculta a los 3 segundos de reposo, independientemente de la dirección del scroll. La portada inicial queda despejada. Ambos controles se recuperan con actividad; un menú abierto, hover o foco dentro de una barra pausan la ocultación. El store comparte listeners y un timer con dos etapas de reposo; se limpia al desmontar el último control.

En la portada principal el navbar comienza oculto desde el HTML inicial. Solo se muestra después de subir (o recuperarlo con el teclado), y esa condición se reinicia al volver al inicio desde otra ruta. La barra de entradas mantiene su condición independiente: solo aparece cuando la portada ya quedó arriba. Los controles ocultos conservan `inert`. Las transiciones existentes de transform/opacity respetan movimiento reducido.

## Verificación

- Regresiones reproducidas antes de los ajustes: navbar visible al bajar y entradas todavía visible después de 3 segundos. Las pruebas cubren dirección, pequeños movimientos, restauración, interacción y ciclos de reposo independientes.
- `pnpm test`: 153 archivos y 1.212 pruebas correctas, incluyendo ocho pruebas del store de controles flotantes.
- `pnpm lint` y `pnpm typecheck`: correctos.
- 31 casos e2e verificados: portada inicial sin navbar, persistencia al bajar pese al cursor/toques/hover de entradas, recuperación al subir, entradas a los 3 segundos y gap de 0 px en 375/1440 px. Las pruebas históricas de menú se ejecutan desde `/eventos`; la portada y su regla de dirección tienen casos propios en `floating-controls.spec.ts`. Layout se repitió después de adaptar su punto de entrada al nuevo comportamiento y sus 12 casos pasaron.
- Revisión real en Chrome: distancia inferior medida de 0 px en PC y móvil. Evidencias: `.local-runtime/outputs/showbox-entradas-sin-margen-pc.jpg` y `.local-runtime/outputs/showbox-entradas-sin-margen-movil.jpg`. Las capturas mantienen el foco sobre entradas para mostrar su anclaje sin ocultación durante la revisión.
- Portada principal revisada en Chrome sin navbar desde la carga; scroll real móvil: oculto al bajar, visible al subir, oculto al volver a bajar. Captura: `.local-runtime/outputs/showbox-portada-navbar-oculto.jpg`.

Sin cambios de datos, esquema, autenticación, dependencias o destinos de entradas.

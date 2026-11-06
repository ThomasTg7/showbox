# Navegación y entradas con ocultación por reposo

La barra de entradas queda pegada al borde inferior en todos los anchos: `bottom: 0`, sin separación en PC ni móvil. Conserva la zona segura móvil.

El navbar se oculta al bajar y reaparece al subir. Acumula un margen de 8 px para ignorar pequeños temblores del scroll y se muestra al volver a los primeros 24 px de la página. Los movimientos de un dedo durante el arrastre no lo recuperan accidentalmente. Mantiene su ocultación por reposo a los 4 segundos.

Entradas se muestra después de pasar la portada y se oculta a los 3 segundos de reposo, independientemente de la dirección del scroll. La portada inicial queda despejada. Ambos controles se recuperan con actividad; un menú abierto, hover o foco dentro de una barra pausan la ocultación. El store comparte listeners y un timer con dos etapas de reposo; se limpia al desmontar el último control.

El navbar ahora está disponible inicialmente también en la portada, en lugar de permanecer oculto durante toda ella. La barra de entradas mantiene su condición independiente: solo aparece cuando la portada ya quedó arriba. Los controles ocultos conservan `inert`; Tab permite recuperarlos. Las transiciones existentes de transform/opacity respetan movimiento reducido.

## Verificación

- Regresiones reproducidas antes de los ajustes: navbar visible al bajar y entradas todavía visible después de 3 segundos. Las pruebas cubren dirección, pequeños movimientos, restauración, interacción y ciclos de reposo independientes.
- `pnpm test`: 153 archivos y 1.210 pruebas correctas, incluyendo seis pruebas del store de controles flotantes.
- `pnpm lint` y `pnpm typecheck`: correctos.
- 29 e2e correctos: abajo oculta el navbar, arriba lo muestra, entradas oculta durante la portada y a los 3 segundos, gap inferior de 0 px en 375/1440 px, recuperación con teclado, hover/foco, menú, portadas y layout.
- Revisión real en Chrome: distancia inferior medida de 0 px en PC y móvil. Evidencias: `.local-runtime/outputs/showbox-entradas-sin-margen-pc.jpg` y `.local-runtime/outputs/showbox-entradas-sin-margen-movil.jpg`. Las capturas mantienen el foco sobre entradas para mostrar su anclaje sin ocultación durante la revisión.

Sin cambios de datos, esquema, autenticación, dependencias o destinos de entradas.

# ShowBox: navbar geométrico y acciones de portada

Corrección solicitada el 5 de noviembre de 2026, posterior a `showbox-local-refresh.md`.

- La portada de inicio y la portada del evento muestran los tres controles en una sola fila desde 1024 px, con entradas destacado en rojo. El diseño de las tarjetas y el esquema móvil de dos controles más «Dónde ver» debajo se conservan.
- Navbar con esquinas recortadas, marco metálico, bisel superior y placa central elevada. Logo de 96/112 px centrado; grupos de navegación en columnas simétricas, con 36 px entre el logo y los enlaces más cercanos en escritorio. Ancho máximo 1040 px; altura 56/64 px. La forma se dibuja en capas decorativas y no recorta los indicadores de foco.
- La barra de entradas aparece al pie de la pantalla en todos los anchos. En PC flota a 16 px del borde inferior; en móvil respeta el área segura. Conserva su condición de aparición al pasar la portada, la protección `inert` y el movimiento reducido. El espacio final de la página permite acceder al pie sin que lo tape la barra.

## Verificación

Los tres casos nuevos de escritorio reprodujeron antes del cambio la distribución apilada de los botones, los 276 px de separación entre enlaces y logo y la posición superior de la barra (y=88 px).

Después del cambio pasaron los 16 e2e de navegación, accesibilidad del menú, disposición de acciones en 320/375/430/1440 px y barra inferior en 375/1440 px. Se revisó visualmente Chrome en PC y móvil, con los datos e imágenes reales de la instalación local. La suite completa de 1.204 pruebas, lint y typecheck también se ejecutaron para esta corrección.

Capturas en `.local-runtime/outputs/showbox-navbar-geometrico.jpg`, `showbox-portada-botones-pc.jpg` y `showbox-barra-inferior-pc.jpg`. La app permanece ejecutándose en `http://localhost:3002`.

No se modificaron esquema, cuentas, datos de eventos ni biblioteca de medios. Los cambios no agregan consultas ni dependencias. La interfaz y sus animaciones conservan las alternativas de teclado y movimiento reducido.

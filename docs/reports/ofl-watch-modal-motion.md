# OFL — Modal Dónde ver con transición suave

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

Se modificó el modal compartido de las tarjetas y la portada. La entrada dura 360 ms con desvanecido, desplazamiento de 12 px y escala mínima; el fondo aparece en 320 ms y ambos salen en 220 ms. Solo se animan transform y opacity. Las preferencias de movimiento reducido desactivan estas animaciones.

Las clases son específicas de este modal. Se conserva el comportamiento de Radix, el foco de teclado, los enlaces y la pausa de Lenis mientras está abierto.

## Verificación

- TDD en navegador: la prueba inicial falló al observar 100 ms. La prueba toma una muestra de opacidad del contenido y del fondo a 120 ms para comprobar que aparecen de forma progresiva.
- `pnpm test:e2e e2e/watch-modal-motion.spec.ts e2e/event-watch.spec.ts --workers=1`: 5 pruebas en verde; apertura progresiva del contenido y fondo, movimiento reducido, ambos botones, enlaces, Escape, retorno del foco y scroll después de cerrar a 375/1440 px.
- `pnpm lint` y `pnpm typecheck`: en verde. Capturas del modal revisadas a 375/1440 px; sin desbordamiento horizontal.
- `pnpm test --maxWorkers=2`: 153 archivos y 1.213 pruebas en verde.
- Servidor local conservado en `http://localhost:3002`; evento OFL 5 responde HTTP 200.

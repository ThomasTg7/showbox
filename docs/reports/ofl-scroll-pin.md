# OFL — Pantalla negra al recorrer peleadores

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

- Causa reproducida en el servidor real: `.ofl-page-enter` conservaba una matriz de transformación identidad por su animación con `fill-mode: both`. Ese ancestro cambiaba el bloque de referencia del pin fijo de GSAP; a mitad del tramo, la sección quedaba a `y ≈ -5.215 px` mientras su espaciador vacío ocupaba la pantalla.
- Corrección: la entrada de página anima únicamente opacidad. No se modifica el pin ni la animación horizontal de las tarjetas.
- TDD: extendido el e2e de home para comprobar visibilidad real durante el tramo fijado, movimiento horizontal, reversa y salida del pin. Falló antes de corregir con `y = -4.570 px`.
- Capturas locales antes/después en `.superpowers/ofl-champion-preview/pin-before-900.png` y `pin-after-900.png`.
- Sin cambios en datos, consultas o dependencias. El carrusel móvil y la preferencia de movimiento reducido siguen disponibles.

Verificación completada:

- `pnpm test -- --maxWorkers=2`: 151 archivos y 1.204 tests aprobados.
- `pnpm lint` y `pnpm typecheck`: aprobados.
- `pnpm test:e2e e2e/home.spec.ts --workers=1`: 14 pruebas aprobadas, incluyendo avance, reversa, salida del pin, carrusel móvil y movimiento reducido.
- Servidor local: comprobación visual a 1440 px con la sección fijada en `y ≈ 0` y las tarjetas avanzando y retrocediendo; a 375 px, carrusel con scroll nativo, sin pin ni overflow horizontal.
- Servidor disponible en `http://localhost:3002`; el detalle de pelea de OFL 5 sigue respondiendo HTTP 200.

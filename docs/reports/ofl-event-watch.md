# OFL — Scroll con rueda y Dónde ver por evento

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

- Reproducido el bloqueo al navegar `/eventos` → inicio: la rueda se detenía alrededor de 2.126 px, aunque la home admitía 8.881 px y arrastrar la barra permitía avanzar. Lenis observaba el elemento `html`, de altura fija, y conservaba el límite anterior. Ahora observa el cuerpo de la página. La prueba de navegación falló antes con 2.540 px y pasa con la corrección; se conserva el pin horizontal.
- Panel → Eventos → editar/crear → Dónde ver: plataformas con nombre, URL e imagen opcional; agregar, quitar y ordenar con botones. Las opciones se guardan para ese evento y se copian al duplicarlo. Se permiten hasta 12, con validación HTTP(S), errores en español y verificación de imágenes disponibles.
- Público: botón Ver en tarjetas de eventos y cartelera resumida. La portada usa el mismo modal desde Dónde ver. Cada opción muestra nombre, imagen cuando existe y el enlace configurado en «Ir a ver». Escape/cerrar devuelve el foco y restablece el scroll. Sin opciones se muestra un estado vacío.
- Datos: migración 0019 aplicada en local. Se conservan transmisiones anteriores; no se inventan plataformas ni enlaces para los eventos que carecen de ellos. FK de imagen restrictiva, registro en referencias de medios, índices de evento/orden e imagen y lecturas por lotes.
- Seguridad: las actions de evento existentes conservan `requireAdmin`, Zod, transacción, auditoría y revalidación del evento/listados. No se agregan endpoints ni dependencias.
- TDD: nuevas pruebas de persistencia/validación y actualización de la prueba de portada fallaron antes de implementar. La prueba de rueda también falló antes de la corrección. El botón Ver de la cartelera resumida tuvo primero una prueba e2e fallida por ausencia del botón.

Verificación completada:

- `pnpm test --maxWorkers=2`: 152 archivos y 1.208 tests aprobados.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado. Una corrida concurrente con el arranque de Playwright leyó tipos de rutas e2e a medio generar; se repitió con ese servidor detenido y pasó, sin cambios de producto por ese fallo de concurrencia.
- E2E: 27 escenarios distintos aprobados entre `home`, `event-watch`, `ofl-hero-actions`, `ofl-event-presentation` y `ofl-champion-presentation`. La corrida inicial tuvo 26 aprobados y el botón de la cartelera resumida aún ausente; una vez implementado, `event-watch` pasó sus 3 pruebas completas.
- Verificación visual del panel y modal a 375 y 1440 px; portada sin overflow a 320, 375, 430, 768 y 1440 px. Capturas en `test-results/event-watch-admin-{375,1440}.png` y `event-watch-modal-{375,1440}.png`.
- Servidor local: navegación con rueda desde `/eventos` a inicio llega hasta 8.881 px y vuelve hacia arriba; modal de cartelera resumida abre/cierra, sin errores de navegador ni overflow. El detalle de pelea de OFL 5 conserva HTTP 200.
- Servidor conservado en `http://localhost:3002`.

# Revisión de main antes de push — 2026-11-08

Se revisaron los nueve commits locales pendientes respecto de `origin/main`: navegación flotante, presentación de portadas, acciones compartidas, oferta de entradas en inicio y ajuste de nombres/categorías. La consulta nueva de entradas limita el resultado a un evento y conserva caché e invalidación por eventos. Los cambios revisados no incorporan escrituras del admin ni nuevas consultas por tarjeta.

La verificación inicial pasó 1.226 pruebas y el build de producción, pero dejó cinco e2e fallidos. Dos usaban el rojo y el plantel históricos; otros detectaron el destino incorrecto de desplazamiento, espacio insuficiente para la foto en pantallas bajas y mediciones de la fila de botones en frames distintos.

## Correcciones

- `SmoothAnchor` sincroniza Lenis antes de resolver el destino. La regresión unitaria falló sin la corrección y pasó después; la comprobación real pasó de detenerse en 434 px a llegar a 912 px.
- La ficha usa márgenes más compactos y mueve la descripción debajo de la portada hasta 800 px de altura móvil. Se conserva el mínimo del 42 % de pantalla para la foto y el contenido completo de la ficha.
- Los e2e reflejan `#E3101F`, Ecuador y las medidas/récords del seed de boxeo. Esperan las fuentes y la hidratación antes de las mediciones correspondientes; la geometría de la botonera se captura en una lectura síncrona, conservando las tolerancias originales.
- ESLint excluye `test-results`, `playwright-report` y `blob-report`, que Playwright puede recrear durante la verificación.

La decisión y su impacto en los planes están registrados en `docs/decisions.md`, entrada del 2026-11-08.

## Verificación final

- E2E: 52 casos distintos verificados de `event-page-changes`, `floating-controls`, `layout`, `showbox-hero-actions` y `text-fit`. La corrida amplia dejó 50 correctos y dos fallos: el flujo del campeón agotó tiempo con compilación concurrente y el reposo del navbar empezaba antes de terminar el ajuste de fuentes. Tras añadir esa espera, los tres casos de la repetición aislada (campeón, reposo móvil y reposo PC) pasaron. No se ejecutó la suite e2e completa del repositorio.
- `pnpm lint` y `pnpm typecheck`: correctos. Se regeneró un archivo de rutas corrupto de la caché local de Next; ese artefacto no forma parte del commit.
- Revisión visual de inicio y rankings en 375 y 1440 px, sin overflow horizontal; ficha compacta revisada en 390×664. Los e2e verifican además anchos de 320 a 1920 px y la ficha en 393×780.
- Revisión React: se conservan Server Components, hojas cliente para interacción y cargas diferidas existentes. Sin nuevos listeners, efectos, dependencias ni lecturas de datos en las correcciones.
- `pnpm build`: correcto, con generación de las rutas públicas y del admin.
- `pnpm test --maxWorkers=2`: 157 archivos y 1.227 pruebas correctas. Se limitaron los workers para reducir la contención durante las comprobaciones locales.

Los e2e usan la base aislada `showbox_e2e`, el Postgres local en 5435 y la configuración local de revisión. No se vacía la base de desarrollo. Las capturas, registros y configuración de ejecución local permanecen fuera de Git en `.local-runtime/work/`.

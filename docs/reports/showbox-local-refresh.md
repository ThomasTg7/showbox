# ShowBox: instalación local, navegación y medios

Solicitud del 5 de noviembre de 2026. El repositorio se trasladó a `C:\Users\thoma\Documents\Proyectos\ShowBox`; la carpeta anterior quedó vacía. Los archivos de ejecución local, las credenciales, capturas y registros se trasladaron a `.local-runtime/`, excluido de Git, ESLint, TypeScript y Vitest.

## Cambios de interfaz

- Navbar flotante separado 12 px del borde en móvil y 16 px en PC, altura 56/64 px. Logo centrado horizontal y verticalmente, ancho 96/112 px. Conserva los cinco destinos y el menú accesible. Entrada/salida con transform y opacidad; sin transición con movimiento reducido. La barra del evento acompaña la nueva separación del navbar.
- Componente compartido `EventActions` en portada, cartelera resumida y tarjetas de eventos. Dos destinos de igual ancho y «Dónde ver» debajo a todo el ancho, controles de al menos 48 px, flechas separadas 16 px del texto y estados de interacción uniformes. Un evento pasado no inventa enlaces de entradas.
- Los enlaces de noticias, boxeadores y rankings también separan sus flechas del texto.
- La portada móvil muestra el afiche completo 4:5 y la información debajo; PC conserva la composición horizontal de fondo.
- YouTube tiene icono y enlace por evento, editables en el panel; los eventos de demostración nuevos incluyen el canal oficial.

## Datos locales

Se consultaron las bases locales de Guerra Campal y OFL. Comparten el plantel y cinco fotos de cuerpo disponibles en Guerra Campal (tres masculinas y dos femeninas), además de un retrato masculino. La lectura del origen se hizo con una transacción de solo lectura. Se reutilizaron esos seis medios, incluyendo originales, recortes, foco y variantes, dentro del almacenamiento de ShowBox.

Los 12 nombres, récords y relaciones de ShowBox se conservan. Los nueve hombres tienen una foto masculina y las tres mujeres una femenina. Las fotos se reutilizan entre perfiles como datos de demostración, según lo autorizado por el usuario. No se trasladaron usuarios ni credenciales de los otros proyectos.

Los cinco eventos tienen `https://www.youtube.com/@ShowBoxPromotionsEC` con un logo SVG 600×300 registrado como medio de plataforma.

El próximo evento, `showbox-fight-night-5`, recibió:

| Campo | Medio | Tamaño | Variantes |
|---|---|---|---|
| Afiche y portada móvil | `84ac2612-b00f-40d9-9d81-7e8fc1fcc445` | 1080×1350, 4:5 | WebP 540/1080 |
| Portada PC | `5f3fff75-850f-4af0-a74c-175a0419436d` | 1920×1080, 16:9 | WebP 800/1280/1920 |
| YouTube | `3e561f03-44e1-426b-a3c9-977917b1fee5` | SVG 600×300 | Original SVG sanitizado |

Las imágenes nuevas pasaron por `createUpload`, `finalizeUpload`, `mediaEditSchema`, `saveMediaEdit` y `assertUsableMedia`, los mismos servicios del panel. Afiche y portada móvil comparten un medio compatible para evitar duplicar el original. Los cambios de perfiles y eventos se registraron en auditoría. El estado anterior y el detalle de asignación están en `.local-runtime/work/before-asset-import.json` y `asset-import-report.json`.

## Imagen horizontal con IA

Herramienta incorporada ImageGen, con el afiche del usuario como referencia. El resultado final registrado en la biblioteca está en `.storage/originals/event_hero/5f3fff75-850f-4af0-a74c-175a0419436d.webp`; el sitio consume sus variantes bajo `.storage/variants/5f3fff75-850f-4af0-a74c-175a0419436d/`.

Prompt utilizado:

> Use case: identity-preserve / compositing. Input image 1 is the edit target: official ShowBox boxing fight-night poster. Create a polished LANDSCAPE 16:9 photographic background adaptation for a desktop website event hero, ideally 1920x1080 or larger matching 16:9. Preserve the exact recognizable faces, skin tones, hairstyles, physiques, poses, wraps and championship belt of the two largest top fighters from the original poster. Recompose these two main fighters prominently on the left and right of the wide frame, framed from waist/chest upward with heads fully inside the upper 70% and generous breathing room above. Use the same dark boxing-arena roof, smoky amber spotlights and gritty cinematic black / warm bronze atmosphere as the input. Smaller fighters from the original can be composed in a subtle lower background montage, with their identities preserved; no new athletes. Keep the central lower half and bottom especially dark and uncluttered, so the website's live white headline and action buttons remain legible over it. This is a background image asset, not a finished text poster: remove ALL embedded text, dates, names, logos, sponsor badges, lettering and ticket information, because the website renders that as HTML. No new text, no invented brand marks, no watermarks. No stretching or horizontal distortion of people. Keep professional photoreal boxing promotion art and clean facial detail.

## Verificación

- 1.204 pruebas unitarias y de integración, 152 archivos: aprobadas.
- Lint y typecheck: aprobados.
- 19 e2e de navegación, menú accesible, acciones, editor de plataformas y modal con movimiento reducido: aprobados. Después del ajuste final de portada móvil se repitieron los 14 e2e de layout y acciones, todos aprobados.
- Revisión visual en Chrome en 375 y 1440 px; imagen vertical completa, imagen horizontal, fotos, botón de YouTube y panel.
- Se revisaron los componentes React: limpieza de listeners, cliente solo para interacción, SVG decorativos, nombres accesibles, enlaces independientes y sin nuevas consultas por componente.

## Ejecución y limitaciones

El sitio permanece en `http://localhost:3002` y el panel en `http://admin.localhost:3002`, con la credencial local existente. Postgres permanece en `127.0.0.1:5435`, con el mismo volumen y datos.

Los enlaces de dependencias y cachés de Next de Windows no se trasladaron limpiamente. Las dependencias activas se reconstruyeron con el lockfile; el servidor y los e2e usan cachés independientes `.next-review-showbox-local` y `.next-review-showbox-e2e`. La revisión automática bloqueó la eliminación de restos en `.local-runtime/work/showbox/node_modules` y de las cachés trasladadas. Esos restos están contenidos dentro de ShowBox, no en la carpeta anterior.

Las fotos heredadas mantienen su resolución original, que en algunos casos es menor que la recomendación actual del panel. El afiche conserva los nombres y la fecha impresos en el archivo del usuario; los nombres y fechas de demostración del sitio se conservan como se solicitó. No se ejecutó la suite e2e completa ni un build de producción. No se publicaron cambios remotos.

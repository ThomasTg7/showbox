# Portada móvil integrada de eventos

Solicitud: presentar nombre, estado, versus, fecha, recinto, contador y acciones sobre la fotografía, eliminando el bloque separado que empezaba después del afiche.

La portada compartida de inicio y ficha usa la imagen móvil como fondo de toda la sección, con composición vertical y degradado para la lectura. Conserva variantes WebP, foco editorial, semántica, orden de teclado y controles de al menos 44 px. La composición de escritorio conserva su distribución.

## Imagen

Se editó el afiche original con la herramienta integrada ImageGen. Único cambio solicitado: eliminar el título central «Padilla vs Jiménez» y reconstruir el fondo y los torsos tapados por las letras. Se pidió conservar identidades, poses, logos, nombres pequeños, patrocinadores y composición. La salida se normalizó a WebP 1080 × 1350 y se registró como `event_hero_mobile` mediante `createUpload`, `finalizeUpload`, `saveMediaEdit` y validación de medio utilizable, con auditoría del cambio del evento.

- Activo local: `.local-runtime/outputs/showbox-portada-movil-sin-texto.webp`.
- Medio: `61996dc3-6387-4402-b70f-94c683baa6c5`.
- Evento: `showbox-fight-night-5`.
- Se conserva el afiche original como pieza de cartelera y la portada horizontal como imagen de escritorio.
- Informe reversible de asignación: `.local-runtime/work/clean-mobile-cover.json`.

Prompt final usado (herramienta integrada):

> Use case: precise-object-edit. Edit target: the supplied 1080x1350 ShowBox boxing event poster. Remove ONLY the large silver headline 'PADILLA VS JIMENEZ' located centrally at approximately x270–800, y725–900. Seamlessly reconstruct the small portions of fighters' torsos and dark arena background hidden behind those letters. Do not add replacement text. Preserve the exact original portrait 4:5 canvas, all fighters' identities, faces, bodies, arrangement, lighting, texture, every other name, sponsor, logo, date, venue text and all other details outside that one central headline unchanged. This is a minimal localized text removal, not a redesign. Output high resolution matching 1080x1350.

## Verificación

- Regresión reproducida antes del cambio con medios reales en la base aislada: a 375 px la fotografía terminaba 564 px antes del final de la portada.
- 26 e2e correctos: portada en 320/375/430 px en inicio y evento, carga de variantes reales, contador, acciones dentro de la imagen, diálogo de YouTube, escritorio y navegación existente.
- Suite unitaria: 1.170 pruebas correctas; el setup de medios agotó su tiempo durante la ejecución concurrente. Repetido aislado, el archivo de medios pasó sus 34 pruebas. Total verificado: 1.204.
- `pnpm lint` y `pnpm typecheck`: correctos.
- Revisado visualmente en Chrome con la fotografía final y el texto eliminado. Captura: `.local-runtime/outputs/showbox-portada-integrada-movil.jpg`.

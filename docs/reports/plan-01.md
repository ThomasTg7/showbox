# Reporte — Plan 01 · Medios

Rama: `plan-01` · Ejecutado por Sonnet (superpowers:executing-plans, en línea) · 2026-09-28

## Tareas completadas

1. **Especificaciones de imagen (dominio)** — `MEDIA_SPECS` por tipo, `checkResolution`, `variantWidthsFor`, `clampCrop`, `describeSpec`. Commit `41fde90`.
2. **StorageDriver local y S3** — `LocalDriver` (carpeta `.storage/`, URL de subida firmada con HMAC), `S3Driver` (R2/MinIO/S3, URL prefirmada), rutas `/media/*` (sirve el driver local) y `/api/media/upload/*` (recibe el PUT firmado). Commit `a29db45`.
3. **Tabla `media` y procesamiento con sharp** — migración `drizzle/0005_*`, `renderVariants` (EXIF → giro → recorte → ajustes → WebP con alfa), `sanitizeSvg`, esquema Zod `MediaEdit`. Commit `91df989`.
4. **Flujo de subida y guardado** — `createUpload` / `finalizeUpload` / `saveMediaEdit` / `purgeOrphanMedia` (en `service.ts`), actions delgadas, `getMedia`, `getMediaByIds`, `getMediaEdit`; el cron de purga también limpia subidas abandonadas. Commit `34e36d9`.
5. **Editor de imagen** — recorte con proporción fija, zoom, giro de 90°, punto de enfoque, brillo/contraste/saturación, texto alternativo, vistas previas en los contextos reales. Commit `040c911`.
6. **Quitar fondo en el navegador** — `Xenova/modnet` (Apache-2.0) en un Web Worker; verificado a mano con una foto de prueba. Commit `560e86a`.
7. **Componentes de uso** — `MediaField`, `MediaGalleryField` (arrastrar + botones subir/bajar), `MediaImage` (público, `srcset` + enfoque) y página de pruebas `/admin/medios` (solo desarrollo). Commit `78e74e1`.

Después de la Task 7 (mismo cierre de plan): aceptar un PNG guardado como `.jpg` (se guarda el tipo real), `dnd-kit` cargado de forma diferida en la galería, documentación (`docs/decisions.md`, `docs/convenciones.md`).

## Desviaciones

Detalle completo en [`docs/decisions.md`](../decisions.md), sección "Plan 01 · Medios (ejecución)". Resumen:

- Variantes con versión en la clave (`variants/<id>/<versión>/<ancho>.webp`) para poder cachearlas para siempre.
- Lógica en `service.ts` (testeable con PGlite) y actions delgadas; las actions devuelven `{ data }` además de `{ error }`.
- `getMediaByIds` (sin N+1), `getMediaEdit` (reabrir el editor) y `media` inicial en los campos: el plan no los traía y los planes 02–04 los necesitan.
- El cron de purga recibe la limpieza de subidas abandonadas como dependencia opcional.
- Sin recorte manual, el servidor recorta al aspecto del tipo centrado en el enfoque; recorte menor que todas las variantes → una sola variante.
- Controles nativos (range/select) en el editor; proporción libre de la galería con una lista de proporciones.
- Página de pruebas `/admin/medios` solo en desarrollo (el plan no traía ninguna pantalla con los campos).
- E2E y `pnpm build` con carpeta propia (`.next-e2e`) y almacenamiento temporal: tu `pnpm dev` abierto impedía correr los e2e. **No cerré tu servidor de desarrollo.**
- ESLint ignora argumentos no usados que empiezan con `_`.

## Pendientes

- **Plan 07 (despliegue):** el bucket S3/R2 necesita CORS (`PUT` para subir, `GET` para reeditar). Decidir si el modelo de quitar fondo se aloja en el bucket en vez del Hub de Hugging Face.
- **Planes 02–04:** al referenciar `media.id` decidir qué pasa con la fila cuando se quita/reemplaza la imagen o se purga la entidad (hoy queda `ready` sin dueño). Usar `MediaField`/`MediaGalleryField` con `media` de `getMediaByIds`.
- Aplicar la migración a tu base de desarrollo: `pnpm db:migrate`.
- Sin S3 configurado se usa `.storage/` en la raíz (ignorada por git). Variables nuevas documentadas en `.env.example` (`STORAGE_DRIVER`, `S3_*`, `STORAGE_LOCAL_DIR`).

## Revisión final

Sin subagente (política de la sesión): **autorrevisión** de la rama contra los puntos de "Review Focus" del plan, más una pasada de seguridad y rendimiento. Cubierto con tests: EXIF rotado (falla si se quita `autoOrient`), PNG con alfa (incluso con ajustes), recorte que se pasa por 1 px, SVG con `<script>`/`on*`/`javascript:`, subida abortada invisible y purgada a las 24 h. Hallazgo corregido en la pasada: un PNG con extensión `.jpg` se rechazaba con un error confuso. Una autorrevisión del autor es más débil que un revisor fresco: conviene que la revisión con Opus mire con lupa `src/features/media/service.ts`, `src/lib/storage/*` y el flujo del editor.

## Comandos para probar

```bash
pnpm db:migrate                 # aplica la tabla media a tu BD de desarrollo
pnpm test                       # 158 tests unitarios
pnpm lint
pnpm typecheck
pnpm test:e2e                   # 19 e2e (requiere Docker); funciona con `pnpm dev` abierto
E2E_DIST_DIR=.next-e2e pnpm build
pnpm dev                        # luego abrir http://localhost:3000/admin/medios
```

Resultado de la última corrida: 158/158 tests, lint y typecheck limpios, 19/19 e2e, build OK.

## Qué pantallas mirar

Todo en `http://localhost:3000/admin/medios` (entrar como admin), en 1440 px y en 375 px:

1. **Foto de cuerpo completo:** subir una foto (mejor una de celular, vertical) → se abre el editor. Mover/zoom, girar, probar "Punto de enfoque" (toca el rostro), ajustes de color, ver las 3 vistas previas. Con una foto chica (< 800×1200) aparece la advertencia amarilla. "Quitar fondo": la primera vez descarga el modelo (~25 MB) y tarda; luego es rápido. Guardar → miniatura → "Editar" reabre con lo guardado.
2. **Logo del patrocinador:** subir un SVG o PNG; el SVG se guarda sin editor.
3. **Galería:** subir varias fotos a la vez, reordenarlas arrastrando y con las flechas Subir/Bajar, editar y quitar.
4. En celular: sin scroll horizontal, botones de 44 px, "Guardar imagen" fijo abajo del editor.

## Revisión (Opus) — 2026-09-28

Sin tareas "Plan 01-fix": todo lo encontrado se corrigió en la revisión (detalle en `docs/decisions.md` → "Revisión del Plan 01").

- **Seguridad y robustez:** URLs de subida de un solo uso (local y S3), `Content-Length` obligatorio en el driver local, tope de 50 MP, procesamiento que achica antes de decodificar a memoria, transacción al guardar ediciones (sin variantes huérfanas).
- **UI:** "Quitar fondo" ya no genera PNG de más de 15 MB; la galería conserva la proporción al reabrir y no deja arrastrar mientras sube; el foco vuelve a "Editar" al cerrar el editor; X del diálogo de 44 px en táctil; fila de galería limpia en 375 px; logos de patrocinador enteros en caja 2:1 (spec §5).
- **Rendimiento:** `MediaImage` con `width`/`height` (sin CLS) y tag de caché por imagen.
- **Planes siguientes:** regla de "dueños de las imágenes" (registro de referencias + barrido del cron, nueva Task 4b del Plan 02); planes 02–04 y 06 usan `MediaField`/`MediaGalleryField`/`getMediaByIds`/`MediaImage` con FKs registradas; Plan 07 con CORS del bucket, encabezados de SVG y modelo de quitar fondo en el bucket.


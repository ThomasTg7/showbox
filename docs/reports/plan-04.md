# Reporte — Plan 04 · Noticias

Rama `plan-04` (desde `main`). Ejecutado con `superpowers:executing-plans` (inline, Sonnet). Un commit por tarea. **No se hizo merge ni push**, ni se empezó el Plan 05. La revisión de toda la rama con contexto nuevo (Opus) queda para la fase de revisión de `docs/WORKFLOW.md`; en esta ejecución solo hubo una autorrevisión del autor (ver «Revisión»).

## Tareas completadas

| Tarea | Resultado |
|---|---|
| 1 Embeds (dominio) | `src/domain/embed.ts`: `parseEmbedUrl` (Instagram con `?igsh=`, `/reel/`, `/reels/`, con cuenta en la ruta; YouTube `youtu.be`, `shorts/`, `watch?v=`, `embed/`; TikTok `@cuenta/video/<id>`; rechaza dominios parecidos y enlaces con usuario), `embedSrc` (YouTube `youtube-nocookie`), `embedCanonicalUrl`, `embedFromAttrs` |
| 2 Esquema y consultas | migración 0011 (`post_categories`, `posts`, `post_fighters`, `post_events`, `post_gallery`, `post_body_media`; índices en cada columna de filtro/orden/FK); `src/domain/post-body.ts` (nodos permitidos); lecturas públicas (listado de 12, home, relacionadas, ficha con **una** lectura de imágenes) y del panel; `seedPosts` (10 noticias, 4 categorías); referencias a imágenes registradas en `MEDIA_REFERENCES` |
| 3 Servicios y acciones | `posts/service.ts` y `categories-service.ts` (auditoría dentro de la transacción), `actions.ts` / `category-actions.ts` delgadas, `cache.ts`, `cached-queries.ts`, `revalidate.ts` (relacionados antes y después), `post` en la papelera |
| 4 Editor y renderer | Tiptap (carga diferida) con barra de formato, imagen por `MediaField`, publicación de red por link y pegado de un link solo en un párrafo vacío; `PostBody` (solo nodos permitidos) y `EmbedFacade` (sin pedir nada a la red hasta el clic) |
| 5 Panel | `/noticias` (filtros, tarjetas en móvil, publicar / papelera desde la fila), `/noticias/nueva`, `/noticias/[id]` (5 pestañas, vista previa firmada), `/noticias/categorias` |
| 6 Noticias públicas | `/noticias` (filtro por categoría, 12 por página, vacíos dignos) y `/noticias/[slug]` (portada o fondo de marca, cuerpo, galería con visor, peleadores y eventos relacionados, compartir) |
| 7 Relacionadas | carrusel «Noticias» en la ficha del peleador (reemplaza `data-slot="fighter-news"`) y en la página del evento |

## Desviaciones

Todas en [`docs/decisions.md`](../decisions.md) → «Ejecución del Plan 04 (Sonnet)» (una entrada por tarea). Las que más afectan a lo siguiente:

- **La fecha de una noticia publicada es el momento de publicarla** (`publishAtFor`): con `normalizePublishAt` un borrador de hace semanas se habría publicado «con fecha vieja» y quedado enterrado en el listado. [Task 3](../decisions.md)
- **`domain/post-body.ts`** nace en la Task 2 (no en la 3/4): una sola lista de nodos permitidos para el editor, el renderer y la validación; se agregó `hardBreak` y la regla de enlaces (`http(s)`, `mailto:`, rutas del sitio). [Task 2](../decisions.md)
- **Las fachadas de embeds no llevan miniatura** (sería una petición a YouTube/Instagram antes del clic). [Task 4](../decisions.md)
- **El enlace guarda solo `href`**: la prueba de pegado encontró `class`/`title`/`target` de la página de origen dentro del JSON. [Task 4](../decisions.md)
- **Visor de galería reutilizado** (`PhotoGallery`) con deslizar agregado, en lugar de un `post-gallery.tsx` propio. [Task 6](../decisions.md)
- `reorderCategories` además de `saveCategory`/`deleteCategory`; `listAdminEvents` con `q`; `searchFightersForBoutAction` reutilizado para el buscador de peleadores. [Tasks 3 y 5](../decisions.md)
- Un error de verdad que encontró el e2e: los paneles del editor eran `<form>` dentro del `<form>` de la noticia (insertar un link enviaba la noticia entera). [Task 5](../decisions.md)

## Revisión (autorrevisión, sin revisor externo)

No se lanzó el revisor con contexto nuevo (no se pidió; el flujo del proyecto lo deja para la fase de revisión). Repasé los cinco puntos de «Review Focus» del plan: Instagram/YouTube (probado), pegado desde Word (probado), noticia sin portada (fondo de marca, e2e), programadas (e2e: 404 antes y visible al reprogramar a una hora pasada) y relación con peleador en la papelera (probado en la consulta; la ficha oculta la relación y el panel la marca «no se ve en el sitio»).

## Pendientes

- **Home:** `getCachedHomeNews`, `TopNews` y `PostCard variant="feature"` están listos y probados en consulta, pero la home los consume en el Plan 06. Sin ninguna noticia «Destacada», `main` es `null`: el Plan 06 decide si cae a la más reciente.
- **Plan 07:** metadatos Open Graph/`NewsArticle`, sitemap con noticias y `noindex` donde corresponda (la vista previa ya lo trae). Las portadas se sirven por `MediaImage`; falta una imagen para compartir por noticia.
- Las noticias programadas aparecen en listados y carruseles con hasta 5 min de retraso (tope de la caché); la ficha, al instante.
- El editor no tiene deshacer/rehacer en la barra (los atajos del teclado sí funcionan) ni arrastre de imágenes dentro del texto; el texto alternativo de una imagen del cuerpo se edita desde el editor de imágenes al subirla.
- Los 44 px táctiles del editor y de los carruseles se revisaron por las reglas de `globals.css` (Playwright no emula `pointer: coarse`).
- Pendientes anteriores sin cambios: ver «Pendiente sin cambiar» del Plan 03.

## Verificación

Todo en verde al cerrar: `pnpm test` (698 tests, 86 archivos), `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` (113 tests) y `E2E_DIST_DIR=.next-e2e pnpm build`.

## Cómo probar

```bash
pnpm db:migrate   # migración 0011 (noticias); ya aplicada a la base de desarrollo
pnpm db:seed      # 10 noticias de ejemplo y 4 categorías (idempotente)
pnpm dev          # o el que ya tienes abierto en :3000
```

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm test:e2e
```

## Qué mirar (en 375 px y 1440 px)

Panel (`http://admin.localhost:3000`):
1. `/noticias`: tarjetas en móvil y tabla en PC; filtros por título, publicación y categoría; «Publicar», «Pasar a borrador», «Ver en el sitio» y «Papelera» (con confirmación).
2. `/noticias/nueva`: enviar vacío (error junto al campo y la pestaña con el primero), portada, pestaña **Texto** (título, negrita, lista, cita, enlace, imagen, y el botón de redes: probar un link de YouTube y uno inválido; pegar un link solo en una línea vacía; pegar texto desde Word), **Galería**, **Relacionados** (buscar «Pérez» o un evento), **Publicación** (programar y «Vista previa»).
3. `/noticias/<id>`: editar, programar para mañana y para una hora ya pasada; botón fijo abajo en móvil.
4. `/noticias/categorias`: agregar, renombrar, subir/bajar y eliminar (una con noticias no se puede).
5. `/papelera`: una noticia enviada a la papelera se restaura y vuelve al sitio.

Sitio público (`http://localhost:3000`):
1. `/noticias`: noticia grande y tarjetas (sin portada: fondo «GC»), filtros de categoría, «Siguiente/Anterior».
2. `/noticias/perez-defiende-el-cinturon-ante-soto` y `/noticias/asi-fue-rojas-somete-en-el-primer-round`: cuerpo, fachada del video (nada se carga hasta tocar «Ver en YouTube»), peleadores y evento relacionados, «Copiar link».
3. `/peleadores/matias-perez` (carrusel «Noticias» al final) y `/peleadores/felipe-araya` (sin noticias: no hay sección).
4. `/eventos/guerra-campal-5` (carrusel «Noticias» al final) y `/eventos/guerra-campal-2` (sin sección).
5. Una noticia con galería (agrégale fotos desde el panel; el seed no trae): abrir una foto, flechas, Escape y deslizar en celular.

## Ajustes pedidos y revisión (Opus, 2026-10-01)

Ajustes pedidos por el usuario antes de revisar (en `docs/decisions.md` → «Ajustes pedidos antes de revisar el Plan 04»): tarjetas sin choque entre categoría, título y bajada; reproductor real de redes dentro del editor; publicador «Con IA»; vista previa en vivo bajo el formulario (celular y PC).

Revisión (`/code-review high`, UI en 375 y 1440 px, Review Focus): correcciones en `docs/decisions.md` → «Revisión del Plan 04 (Opus)». Lo principal: una noticia relacionada con un peleador en la papelera ya se puede volver a guardar; publicar una programada que ya salió conserva su fecha; la home cae a la noticia más reciente si no hay destacada; índice para el orden de los listados (migración 0012); la vista previa en vivo no redibuja el formulario en cada tecla. Planes 05–07 y spec actualizados.

```bash
pnpm db:migrate   # migración 0012 (índice del orden de noticias); ya aplicada a la base de desarrollo
```

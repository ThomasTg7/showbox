# Plan 07 — SEO, analítica, calidad y lanzamiento · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SEO técnico completo, analítica sin cookies, verificación de rendimiento y accesibilidad, despliegue en Vercel y documentación para operar y migrar a VPS.

**Architecture:** Helpers puros de metadatos y JSON-LD en `src/domain/seo.ts`; cada página los usa en `generateMetadata` y renderiza `<JsonLd>`. `sitemap.ts` y `robots.ts` de Next leen la BD con el mismo `publicScope`. Presupuestos de rendimiento con Lighthouse CI y accesibilidad con axe en Playwright.

**Tech Stack:** Heredado. `@vercel/analytics` (o Umami por script), `@lhci/cli`, `@axe-core/playwright`, `schema-dts` (tipos JSON-LD).

**Spec:** `docs/superpowers/specs/2026-09-28-guerra-campal-design.md` (§1, §7)

## Global Constraints

- Seguir `docs/convenciones.md` (patrones ya construidos y probados en Plan 00: actions, auth, correo, papelera, paginación, fechas, tests). Manda sobre lo que diga este plan si hay conflicto.
- Hereda Plan 00–06.
- Plantilla de título: `"%s | Guerra Campal"`; home: `"Guerra Campal — MMA en Chile"`.
- Descripción máx. 160 caracteres (se trunca en palabra completa con "…").
- Imagen Open Graph: `getCachedShareImage()` (`src/features/settings/cached-queries.ts`, Plan 06: lee la clave `share` cacheada y la imagen con su `mediaCacheTag`; `null` si no hay) → su variante de 1200 px como URL absoluta; fallback estático `public/og-default.jpg`. No leer `site_settings` directo. **Excepción (revisión del Plan 04):** una noticia con portada usa su portada (variante de 1600 px de `news_cover`, 16:9; `og:image:width/height` de esa variante); sin portada, la imagen de marca.
- **Dos dominios (decisión posterior al Plan 02):** sitio en `SITE_URL` (`guerracampal.cl`) y panel en `ADMIN_URL` (`admin.guerracampal.cl`), servidos por la misma app; `src/proxy.ts` + `src/lib/admin-routing.ts` deciden por dominio. `robots.txt` (`src/app/robots.ts`) responde según el host: en el panel `Disallow: /` siempre; en el sitio lo de abajo. `sitemap.xml` solo en el sitio. Canonical y Open Graph siempre con `SITE_URL`.
- `robots.txt` del sitio: `Disallow: /admin`, `Disallow: /api`; `Sitemap: <SITE_URL>/sitemap.xml`. Si `SITE_URL` termina en `.vercel.app` y `ALLOW_INDEXING` no es `true`, `Disallow: /` (evitar indexar el subdominio de prueba antes del lanzamiento).
- `SITE_URL` desde variable de entorno; cambiar de dominio no requiere cambios de código.
- Analítica: `ANALYTICS_PROVIDER=vercel|umami|none`; nunca cookies.
- Presupuestos (móvil, Lighthouse): LCP < 2.5 s, CLS < 0.1, TBT < 300 ms, Accesibilidad ≥ 95, SEO = 100 en home, ficha de peleador y página de evento.
- **Configuración del sitio (Plan 06, ya construido; ver `docs/convenciones.md` → «Home, sitio y configuración»):** toda lectura pública por `getCachedSetting(key)` (tag `settings`; `about`, `contact`, `socials`, `ticketsFaq`, `privacy`, `footer`, `share`, `seo`). Verificación de Google: `getCachedSetting("seo").googleVerification` (ya guarda solo el código; vacío = no se dibuja). Redes: `socialLinks(socials)` (`src/features/settings/social-links.ts`, solo las usables). Texto vacío de una página: `hasPostBodyContent(body)`.
- **Home (Plan 06):** estática con tags (`events`, `posts`, `fighters`, `rankings`, `sponsors`, `settings`, `divisions`, `media`), revalida a los 5 min; hoy exporta un `metadata` fijo («Guerra Campal | MMA en Chile»). Su `generateMetadata` solo puede usar lecturas cacheadas (nada de `searchParams` ni `headers()`, o deja de ser estática).
- Heredado del Plan 02: la ficha de peleador (y la de evento y noticia) es dinámica por `?preview=` pero sus datos vienen de `unstable_cache`; `generateMetadata` ya reutiliza la misma lectura (`cache()` de React) y marca `noindex` en la vista previa. Las fichas usan `FighterProfileDTO` (sin `Date`); el JSON-LD se arma desde ese DTO. Contenido programado aparece en listados con hasta 5 min de retraso (tope de caché).

## Review Focus

- Nombre con comillas o tildes en título/descripción (`Matías "El Toro" Pérez`) debe escaparse bien en meta tags y JSON-LD.
- Evento cancelado: JSON-LD con `eventStatus: EventCancelled`; evento pasado sigue indexable.
- Contenido en borrador nunca aparece en el sitemap ni tiene JSON-LD accesible por URL directa.
- Canonical sin parámetros de filtro (`/peleadores?division=…` → canonical `/peleadores`); `/peleadores?q=…` (búsqueda) con `noindex`.
- Previsualización de admin (`?preview=`) devuelve `noindex`.

---

### Task 1: Helpers de SEO y JSON-LD

**Files:**
- Create: `src/domain/seo.ts`, `src/domain/seo.test.ts`, `src/components/seo/json-ld.tsx`

**Interfaces:**
- Produces:
  - `truncateDescription(text: string, max = 160): string`
  - `pageMetadata(input: { title: string; description: string; path: string; ogImageUrl: string; noindex?: boolean }): Metadata`
  - `eventJsonLd(e: EventPageDTO, siteUrl): WithContext<SportsEvent>` (name, startDate ISO con offset, endDate, eventStatus, eventAttendanceMode Offline, location Place+PostalAddress, image, organizer Organization, offers desde `ticket_tiers` con `priceCurrency: 'CLP'` y `availability` InStock/SoldOut, competitor = peleadores de la pelea estelar)
  - `fighterJsonLd(f: FighterProfileDTO, siteUrl): WithContext<Person>` (name, alternateName = apodo, nationality, height, weight, image, sameAs = redes)
  - `articleJsonLd(p: PostDTO, siteUrl): WithContext<NewsArticle>` (`headline` = título, `description` = bajada, `datePublished` = `p.date` —ya es el momento de publicarla, `publishAtFor`—, `dateModified` = `p.updatedAt`, `image` = portada (1600 px) o la de marca, `articleSection` = categoría, `author`/`publisher` = Organization Guerra Campal, `mainEntityOfPage` = URL canónica, `about` = peleadores relacionados como `Person` con su URL). Agregar `updatedAt` (ISO) a `PostDTO` en `getPublicPostBySlug` (`src/features/posts/queries.ts`); el `PostDTO` de la vista previa en vivo (`buildLivePreviewPost`, `src/features/posts/live-preview.ts`) lo llena con la misma fecha.
  - `organizationJsonLd(input: { socials: SettingValue<"socials">; contact: SettingValue<"contact">; logoUrl: string }, siteUrl): WithContext<Organization>` (name «Guerra Campal», url, logo, `sameAs` = `socialLinks(socials)`, `email`/`telephone` de `contact` solo si tienen valor) y `websiteJsonLd(siteUrl): WithContext<WebSite>` (name, url, `inLanguage: "es-CL"`).
  - `<JsonLd data />` — `<script type="application/ld+json">` con `JSON.stringify` y `<` escapado como `<`.

- [x] **Step 1: Tests que fallan:** `truncateDescription` corta en palabra y agrega "…" sin pasar de 160; `eventJsonLd` de evento cancelado → `eventStatus: 'https://schema.org/EventCancelled'`; tramo agotado → `availability: 'https://schema.org/SoldOut'`; `fighterJsonLd` con apodo con comillas produce JSON válido; `JsonLd` escapa `</script>`.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Step 3: Commit** `feat(seo): metadata and json-ld helpers`

### Task 2: Metadatos por página

**Files:**
- Modify: `generateMetadata` en `src/app/(site)/**/page.tsx` (home, eventos, evento, peleadores, peleador, rankings, noticias, noticia, entradas, quiero-pelear, patrocinar, nosotros, contacto, privacidad); `src/app/(site)/layout.tsx` (`metadataBase`, plantilla de título, `verification: { google }` desde `getCachedSetting("seo")`, `og:image` por defecto desde `getCachedShareImage()`, `<html lang="es-CL">`)
- Test: `e2e/seo.spec.ts`

- Home (Plan 06 ya construido, `src/app/(site)/page.tsx`): reemplazar el `metadata` fijo por `pageMetadata` (título absoluto «Guerra Campal — MMA en Chile», canónica `/`) y dibujar `<JsonLd>` con `organizationJsonLd` + `websiteJsonLd` (lecturas cacheadas `getCachedSetting("socials")` y `getCachedSetting("contact")`, en paralelo con `getHomeData()`). Verificar en el build que `/` sigue saliendo estática.
- Páginas fijas (Plan 06): `/nosotros` y `/privacidad` sin texto (`hasPostBodyContent` falso: hoy muestran «Pronto…») y `/contacto` sin ningún dato llevan `noindex`; con contenido, indexables.
- Rankings (Plan 05 ya construido): `/rankings` hoy exporta un `metadata` fijo; pasarlo a `generateMetadata` con `pageMetadata`. `?nivel=amateur` es otra página (otro contenido): canónica propia `/rankings?nivel=amateur` y título «Rankings amateur»; cualquier otro valor de `nivel` canoniza a `/rankings`. Sin JSON-LD propio.
- Noticias (Plan 04 ya construido): `/noticias/[slug]` ya tiene `generateMetadata` (título, bajada, `noindex` con `?preview=`) que comparte `loadPost` (`cache()` de React): pasarlo a `pageMetadata` y agregar `og:type=article`, `article:published_time`, `article:section` y la portada como imagen. `/noticias`: canónica propia con solo los parámetros válidos (`categoria` existente y `pagina` > 1; nunca uno inventado), título «Noticias» o «<Categoría> · Noticias». El JSON-LD va en `page.tsx`, no dentro de `PostArticle`: así la vista previa en vivo del panel no lo dibuja.
- [x] **Step 1: Test e2e que falla:** la home tiene `<title>` «Guerra Campal — MMA en Chile», la etiqueta de verificación tras guardarla en Configuración → SEO y JSON-LD `Organization` con el Instagram guardado en `sameAs`; cada ruta pública tiene `<title>` único con plantilla, `meta[name=description]`, `link[rel=canonical]` sin query (salvo `/noticias?categoria=…&pagina=…`, autocanónica), `og:image`; ficha de peleador, evento y noticia tienen JSON-LD parseable del tipo correcto (`NewsArticle` con `datePublished`); una noticia con portada usa esa imagen en `og:image`; `?preview=` agrega `noindex`.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Step 3: Commit** `feat(seo): per-page metadata and structured data`

### Task 3: Sitemap y robots

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/features/seo/sitemap-entries.ts`, `sitemap-entries.test.ts`

**Interfaces:**
- Produces: `getSitemapEntries(db, siteUrl): Promise<MetadataRoute.Sitemap>` — rutas fijas (incluye `/noticias`, `/entradas`, `/quiero-pelear`, `/patrocinar`, `/contacto` y, solo si su texto tiene contenido (`getSetting` + `hasPostBodyContent`), `/nosotros` y `/privacidad` —esta con `lastModified` = `privacy.updatedAt`—; `/rankings` y `/rankings?nivel=amateur` solo si `getPublicRankings(db, nivel)` trae tarjetas —un nivel oculto con `ranking_levels` devuelve ninguna—; `lastModified` de cada una = `max(ranking_versions.created_at)` del nivel, una consulta agrupada) + peleadores, eventos y noticias públicos (`publicScope(posts)` de `src/db/public-scope.ts`; `/noticias/<slug>`) con `lastModified = updated_at`; una consulta por entidad (solo `slug` y `updated_at`), nunca las fichas completas. Las categorías con alguna noticia visible (`listPublicPostCategories`) entran como `/noticias?categoria=<slug>`. Nada del panel (`/vista-previa-noticia` vive en el subdominio del panel, que ya responde `Disallow: /`).
- Decidir (y anotar en `docs/decisions.md`) si 5 min de retraso para lo programado basta; si no, el cron diario no alcanza: agregar un cron cada 5 min que expire los tags de los listados (en un route handler no existe `updateTag`: usar `revalidateTag` con expiración inmediata, verificando en la documentación de Next 16 que no sirva contenido viejo) cuando hay `publish_at` vencido desde la última corrida.

- [x] **Step 1: Tests que fallan:** entradas incluyen `/quiero-pelear`, `/patrocinar` y `/contacto` siempre, `/privacidad` solo con texto guardado (y con su `updatedAt`), `/peleadores/matias-perez` y `/rankings` (con `lastModified` = la versión de ranking pro más nueva), excluyen borradores, programados futuros y papelera; `robots` con `SITE_URL=https://gc.vercel.app` y sin `ALLOW_INDEXING` → `disallow: '/'`; con `ALLOW_INDEXING=true` → solo `/admin` y `/api`.
- [x] **Step 2:** FAIL → implementar → PASS.
- [x] **Step 3: Commit** `feat(seo): dynamic sitemap and robots`

### Task 4: Analítica sin cookies

**Files:**
- Create: `src/components/analytics.tsx`
- Modify: `src/app/(site)/layout.tsx`

**Interfaces:**
- Produces: `<Analytics />` según `ANALYTICS_PROVIDER` (`vercel` → `@vercel/analytics/react`; `umami` → script `UMAMI_SRC` con `data-website-id`; `none` → nada). No se incluye en el panel (subdominio de `ADMIN_URL`).

- [x] **Step 1:** Implementar. **Verificación:** con `ANALYTICS_PROVIDER=none` el HTML no contiene scripts de analítica; con `vercel` aparece; en el panel nunca. Ninguna cookie nueva en `document.cookie` tras navegar.
- [x] **Step 2: Commit** `feat: cookieless analytics`

### Task 5: Rendimiento y accesibilidad

**Files:**
- Create: `lighthouserc.json`, `e2e/a11y.spec.ts`
- Modify: componentes según hallazgos

- [x] **Step 1: Test que falla:** `e2e/a11y.spec.ts` corre axe en home, `/peleadores`, ficha, `/eventos/<slug>`, `/rankings`, `/noticias`, `/noticias/<slug>` (una con video: la portada de YouTube —botón «Reproducir video de YouTube»— y el recuadro «Ver en Instagram/TikTok/Facebook» deben pasar), `/quiero-pelear`, `/patrocinar`, `/contacto` y el login del panel (`adminUrl("/login")` de `e2e/fixtures/admin.ts`): 0 violaciones `serious`/`critical`.
- [x] **Step 2:** Corregir hasta PASS (contraste amarillo sobre blanco solo en textos grandes, foco visible, `aria-label` en controles de ícono, orden de encabezados).
- [x] **Step 3:** `pnpm build && pnpm start` + `lhci autorun` con los presupuestos de Global Constraints en perfil móvil. Corregir (imagen del hero con `priority` y `fetchPriority`; GSAP/Lenis ya se cargan de forma diferida y solo con ≥ 901 px desde la revisión del Plan 06; la presentación `IntroLoader` aparece tras hidratar y no debe contar como LCP —si Lighthouse la toma, revisarla—; fuentes con `display: swap`) hasta cumplir.
- [x] **Step 4: Commit** `perf/a11y: meet lighthouse budgets and axe checks`

### Task 6: Despliegue en Vercel

**Files:**
- Create: `docs/deploy.md`, `.env.example` (completo y comentado)
- Modify: `package.json` (`"vercel-build": "pnpm db:migrate && next build"`)

- [ ] **Step 1 (persona, pendiente; el código y la guía `docs/deploy.md` están listos):** Ejecutar con el usuario siguiendo `docs/configuracion-externa.md` (Google y Resend ya están documentados ahí; completar el resto) (cada servicio lo crea el usuario con su cuenta): Postgres (Neon o Supabase, solo cadena de conexión), bucket R2 con dominio público, dominio de envío en Resend, credenciales OAuth de Google (redirect `https://<SITE_URL>/api/auth/callback/google`), `BETTER_AUTH_SECRET` (también firma los enlaces de vista previa: no hay `PREVIEW_SECRET`), `CRON_SECRET`, `SITE_URL`, `ANALYTICS_PROVIDER=vercel`, `STORAGE_DRIVER=s3`, `MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM`. Con Google configurado, el botón aparece solo.
- [ ] **Step 1b: Bucket de medios** (decisiones de la revisión del Plan 01 en `docs/decisions.md`):
  - CORS del bucket: orígenes `SITE_URL` (y la URL de preview si se usa), métodos `PUT` (el navegador sube el original directo) y `GET` (reeditar una imagen, vista previa recortada en canvas, quitar fondo), encabezados permitidos `Content-Type` e `If-None-Match`, `MaxAgeSeconds` 3600.
  - Verificar la escritura condicional: repetir el `PUT` a una URL firmada ya usada responde 412 (la URL es de un solo uso). Si el proveedor no la respeta, anotarlo en `docs/decisions.md`.
  - Regla de encabezados del dominio de medios (Cloudflare → Rules → Transform Rules → Response headers): `X-Content-Type-Options: nosniff` y `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` (igual que el driver local), para que un SVG abierto directo no ejecute nada.
  - Modelo de "Quitar fondo": subir los archivos de `Xenova/modnet` (`config.json`, `preprocessor_config.json`, `onnx/model.onnx`) a `models/Xenova/modnet/` del bucket; en `src/features/media/bg-removal/worker.ts`, si existe `NEXT_PUBLIC_MODEL_BASE_URL`, usar `env.remoteHost = <esa URL>/` y `env.remotePathTemplate = "{model}/"`; sin la variable (desarrollo) sigue el Hub. Agregar la variable a `.env.example` y actualizar `bg-removal/README.md`.
  - **Verificación:** subir una foto en producción, reeditarla (vista previa recortada visible) y quitar el fondo: en la pestaña Red, el modelo viene del dominio de medios.
- [ ] **Step 1c: Dominios:** en el proyecto de Vercel agregar `guerracampal.cl` (y `www` con redirección) y `admin.guerracampal.cl` al **mismo** proyecto; DNS: `A`/`CNAME` que indique Vercel para ambos. Variables: `SITE_URL=https://guerracampal.cl`, `ADMIN_URL=https://admin.guerracampal.cl` (obligatorias en producción: sin ellas la app no arranca; ya no se usa `BETTER_AUTH_URL`). Antes del dominio propio: dos alias `*.vercel.app` (p. ej. `guerracampal.vercel.app` y `guerracampal-admin.vercel.app`) y esas URL en las variables. Google OAuth y los enlaces de los correos apuntan al panel (`docs/configuracion-externa.md`). Los *preview deployments* de Vercel tienen una sola URL: el panel no se puede probar ahí salvo asignando un alias de panel a la rama (ver pendiente de Plan 00 en `docs/decisions.md`).
- [ ] **Step 2:** Primer deploy; `scripts/create-admin.ts` contra producción para el email de la promotora.
- [ ] **Step 3: Verificación (smoke test en producción):** `guerracampal.cl/admin` redirige a `admin.guerracampal.cl`; login admin, subir foto, crear peleador borrador, previsualizar, publicar, verlo en el sitio; guardar el correo de avisos en Configuración → Contacto (`contact.notifyEmail`; sin él la bandeja recibe los mensajes pero no sale correo), enviar «Quiero pelear» y recibir el email con el enlace a la bandeja del panel; `/sitemap.xml` y `/robots.txt` responden; cron de purga responde 401 sin secreto.
- [x] **Step 4: Commit** `docs: deployment guide`

### Task 7: Guías de operación y migración a VPS

**Files:**
- Create: `docs/guia-admin.md` (para la promotora: cómo crear evento, armar cartelera, noche de pelea, cargar resultados, rankings —cada guardado es una versión nueva y las flechas ▲▼ comparan con la anterior; sugerencias tras un evento (Aceptar/Descartar); confirmar el cambio de título; «Dejar vacante»; el aviso «Otra persona guardó este ranking…», los avisos de peleadores retirados y «Ocultar del sitio» / «Mostrar en el sitio» para armar los rankings sin que el público los vea—, noticias —editor, pegar un link de Instagram/YouTube/TikTok/Facebook (dentro de una frase también: la publicación va debajo del párrafo), publicador «Con IA» con su prompt (`src/features/posts/ai-prompt.ts`) y la vista previa en vivo en celular y PC—, patrocinadores —nivel y dónde sale cada uno, vigencia por días, «todos los eventos» o eventos elegidos, ordenar—, bandeja —estados, responder por correo o WhatsApp—, configuración —las 8 pestañas, en especial el correo de avisos, la política de privacidad y la imagen para compartir—, formatos de imagen con la tabla del spec, papelera)
- Create: `docs/vps-migration.md`, `deploy/docker-compose.prod.yml` (app Next standalone, postgres:17, minio, umami, caddy con HTTPS para `guerracampal.cl` **y** `admin.guerracampal.cl` hacia la misma app, conservando el `Host`; Caddy **reemplaza** `X-Forwarded-For` con la IP real —sin `trusted_proxies`, salvo los rangos de una CDN delante— y el puerto de Next no se expone: el límite de 5 envíos por IP de los formularios lee la primera dirección de ese encabezado, ver `docs/decisions.md` → «Revisión Plan 06»), `deploy/Dockerfile`, `deploy/cron` (purga diaria con `curl` + `CRON_SECRET`; incluye subidas abandonadas e imágenes sin uso), CORS de MinIO y encabezados del dominio de medios en Caddy iguales a los del Step 1b de la Task 6

- [x] **Step 1:** `next.config.ts` con `output: 'standalone'`; `docker compose -f deploy/docker-compose.prod.yml up` levanta el sitio localmente con MinIO y `STORAGE_DRIVER=s3` apuntando a MinIO. **Verificación:** home carga e imágenes se sirven desde MinIO.
- [x] **Step 2:** Documentar migración: `pg_dump`/`pg_restore`, `rclone sync` R2 → MinIO, cambio de DNS, variables a cambiar.
- [x] **Step 3: Commit** `docs: admin guide and vps migration path`

### Task 8: Lanzamiento

> **Revisión Plan 07 (Opus):** no hay Plan 08. Esta tarea la hace la persona con sus cuentas, después de los pasos de `docs/deploy.md` §1–4 (servicios, Vercel, primer deploy, primer admin y prueba de humo) o de `docs/vps-migration.md`.

- [ ] **Step 1:** La promotora carga contenido real desde el panel (peleadores, eventos pasados con resultados, próximo evento, noticias, patrocinadores y configuración). **Obligatorio antes de indexar:** Configuración → Privacidad con la política (Ley 19.628: qué datos piden los formularios, para qué, cuánto se guardan y cómo pedir su eliminación; los formularios enlazan a `/privacidad`), Contacto (con el «Correo para avisos»), Redes, Nosotros e Imagen al compartir. Verificar que la base de producción no tiene datos seed (el seed nunca corre en producción).
- [ ] **Step 2:** Revisión final con `/rankings`, fichas y eventos reales; corregir textos.
- [ ] **Step 3: Rendimiento contra la URL real** (con fotos reales, el LCP pasa a ser la imagen): `pnpm lighthouse -- --collect.url=https://guerracampal.cl/ --collect.url=…/peleadores/<slug> --collect.url=…/eventos/<slug>` (presupuestos de `lighthouserc.json`) y PageSpeed Insights en móvil. Si el LCP pasa de 2,5 s: revisar el peso de la foto de portada y el JS que corre antes del primer pintado (ver `docs/decisions.md` → «Revisión Plan 07»). Semanas después, Search Console → Métricas web principales (datos de campo).
- [ ] **Step 4: Indexar:** con el dominio propio como `SITE_URL` el sitio ya se abre (`ALLOW_INDEXING=true` solo si se lanza bajo `*.vercel.app`); en Vercel, los alias `*.vercel.app` del sitio y del panel → **Redirect** al dominio; verificar el dominio en Search Console (código en Configuración → SEO) y enviar `https://guerracampal.cl/sitemap.xml`.
- [ ] **Step 5:** Anuncio en redes con link. Tag `v1.0.0`.

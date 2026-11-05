# Reporte — Plan 07 · SEO, analítica, calidad y lanzamiento

Rama `plan-07` (desde `main`, que ya incluía el Plan 06 revisado). Ejecutado con `superpowers:executing-plans` (inline, Sonnet). Un commit por tarea (más correcciones). **No se hizo merge ni push.** Alcance acordado: Tasks 1–5 completas (código), de la 6 y la 7 solo la parte de código y documentación; todo lo que necesita **tus cuentas** (Vercel, Postgres, R2, Resend, Google, dominio, primer deploy) y la Task 8 (lanzamiento) quedan como lista de pasos para ti (abajo y en [`docs/deploy.md`](../deploy.md)).

> **Revisado por Opus (2026-10-05):** correcciones y veredictos en [`docs/decisions.md`](../decisions.md) → «Revisión del Plan 07». Lo más importante para el despliegue en VPS: el build ya no usa `host.docker.internal` (usa `network: host`), Caddy reenvía `{hostport}`, la redirección `www` lleva esquema y el cron se llama con `sh`. Caddy sí se probó (imagen `caddy:2.8`).

## Tareas completadas

| Tarea | Resultado |
|---|---|
| 1 Helpers SEO y JSON-LD | `src/domain/seo.ts` (puro): `truncateDescription`, `pageMetadata`, `ogImage`, `eventJsonLd`, `fighterJsonLd`, `articleJsonLd`, `organizationJsonLd`, `websiteJsonLd`, `serializeJsonLd`; `<JsonLd />` (escapa `<`); `toSantiagoIso` (fechas del evento con el desfase de Chile); `PostDTO.updatedAt` (`dateModified`) |
| 2 Metadatos por página | las 14 páginas públicas con `generateMetadata` (`sitePageMetadata`): título con plantilla `%s \| Guerra Campal` (la home «Guerra Campal — MMA en Chile»), descripción ≤ 160, canónica, Open Graph/Twitter con la imagen de Configuración (o `public/og-default.jpg`; la noticia con portada usa su portada de 1600 px, `og:type=article`); `metadataBase`, verificación de Google desde Configuración → SEO, `lang="es-CL"`; canónicas sin parámetros de filtro, `?q=` y vista previa con `noindex`, `/rankings?nivel=amateur` propio; páginas fijas vacías con `noindex`; JSON-LD en home (`Organization` + `WebSite`), ficha, evento y noticia (nunca en un borrador en vista previa). La home sigue **estática** |
| 3 Sitemap y robots | `sitemap.xml` (cacheado con tags; solo en el sitio, el panel responde 404) y `robots.txt` por dominio (panel `Disallow: /`; sitio `/admin` y `/api` + `Sitemap:`; `*.vercel.app` cerrado sin `ALLOW_INDEXING=true`); decisión sobre lo programado: 5 min alcanzan |
| 4 Analítica | `<Analytics />` solo en el sitio: `ANALYTICS_PROVIDER=vercel\|umami\|none`, sin cookies |
| 5 Rendimiento y accesibilidad | `e2e/a11y.spec.ts` (axe, 0 `serious`/`critical`, 18 pruebas incl. 375 px, embeds de redes y el login del panel), 3 hallazgos corregidos (pie `#666`, enlace de foto sin nombre, `opacity` en tramos agotados), fuentes Barlow sin precarga, `lighthouserc.json` + `pnpm lighthouse` (los 5 presupuestos pasan; ver «Rendimiento») |
| 6 Despliegue (código y guía) | `vercel-build`, `.env.example` completo, `docs/deploy.md`, modelo de «Quitar fondo» desde el bucket (`NEXT_PUBLIC_MODEL_BASE_URL`, `modelSource()`) |
| 7 Guías y VPS (código y guías) | `output: "standalone"`, `deploy/` (Dockerfile, compose de producción, Caddyfile, cron, env de ejemplo), `docs/vps-migration.md`, `docs/guia-admin.md` (para la promotora), README del repo |
| 8 Lanzamiento | **no se ejecuta** (es tuyo: contenido real, Search Console, anuncio, `v1.0.0`) |

## Desviaciones

Todas en [`docs/decisions.md`](../decisions.md) → «Plan 07 — SEO, analítica, calidad y lanzamiento». Las que más importan:

- **`pageMetadata` recibe `ogImage: { url, width, height }` y `title: string | { absolute }`** (el plan decía `ogImageUrl: string`): la portada de una noticia necesita `og:image:width/height`. [Task 1](../decisions.md)
- **`eventJsonLd` no ofrece entradas** en un evento finalizado o cancelado (la página tampoco las vende). [Task 1](../decisions.md)
- **`/contacto` entra al sitemap solo si tiene datos** (el plan decía «siempre»): la Task 2 lo marca `noindex` vacío y un sitemap con una URL `noindex` hace avisar a Search Console. [Task 3](../decisions.md)
- **Lighthouse con red «Fast 4G» aplicada** (165 ms, 9 Mbps, CPU ×4) y no el «Slow 4G simulado» por defecto: contra `localhost` el simulador cuenta todo el JS como parte del camino al LCP y da 3,3–3,6 s aunque el LCP real es igual al primer pintado (120–280 ms). **Hay que repetir la medición contra la URL desplegada.** [Task 5](../decisions.md)
- **Fuentes:** solo Anton se precarga (`preload: false` en las 7 variantes de Barlow, ~100 KB): `/contacto` bajó de 3,17 s a 2,45 s de LCP en Lighthouse. Costo: el texto de Barlow aparece un instante con la fuente de reemplazo (de métricas ajustadas, sin saltos). [Task 5](../decisions.md)
- **`@vercel/analytics/next`** en vez de `/react`; Umami lleva además `UMAMI_WEBSITE_ID`. [Task 4](../decisions.md)
- **Imágenes de MinIO:** MinIO ya no publica imágenes oficiales (Docker Hub y quay.io no las entregan); el compose usa las de **Chainguard** (`cgr.dev/chainguard/minio`). [Task 7](../decisions.md)
- **Proyecto de Compose `guerracampal-prod`** (el de desarrollo ya es `guerracampal`: con el mismo nombre habría reemplazado tu Postgres de desarrollo). [Task 7](../decisions.md)
- **`vitest.config.ts` excluye `**/.next*/**`:** el build `standalone` copia el código y sus pruebas dentro de `.next/standalone`. [Task 7](../decisions.md)

## Rendimiento y accesibilidad (resultado medido)

- **axe:** 18 pruebas en verde (0 violaciones `serious`/`critical`), incluidas home, ficha, evento (próximo y jugado), rankings, noticias (con YouTube y con Instagram/TikTok/Facebook), formularios, contacto, entradas y el login del panel; y a 375 px home, ficha, evento y noticias.
- **Lighthouse** (`pnpm lighthouse`, build de producción, base con datos, móvil, mediana de 3): LCP 2,3–2,4 s · CLS 0 · TBT < 20 ms · Accesibilidad 100 · SEO 100 en la home, la ficha de peleador y el evento → **los cinco presupuestos pasan**. Limitaciones y por qué no «Slow 4G»: ver arriba y `decisions.md`. La portada sembrada no tiene foto: el LCP es el texto gigante decorativo; con foto real el LCP será la imagen.

## Verificación

Corrida final (sin otra actividad en paralelo), todo en verde:

- `pnpm test`: **130 archivos / 1094 pruebas**.
- `pnpm lint` y `pnpm typecheck`: sin errores.
- `pnpm build` (con `DATABASE_URL` de la base de desarrollo, migrada): compila; la home y las páginas fijas siguen **estáticas** (`○`).
- `pnpm test:e2e`: **231 pruebas, 231 pasan** (seo 30, a11y 18, static-pages 13 —con las nuevas— más las de los planes anteriores). Ojo: las dos corridas anteriores de la suite completa con el tiempo por defecto (30 s) tuvieron **2–5 timeouts distintos cada vez** (en specs ajenos al SEO: panel, noche de pelea, historial), todos verdes al repetirlos aislados; por eso `playwright.config.ts` ahora da 60 s por prueba (`decisions.md` → «Verificación final»). Si en tu PC fallan al azar, baja los workers: `pnpm test:e2e --workers=4`.
- `pnpm lighthouse` (con `pnpm build && pnpm start` en :3000): exit 0, los cinco presupuestos pasan.
- Si `pnpm test:e2e` dice que no encuentra `dockerDesktopLinuxEngine`, abre Docker Desktop.

## Verificación del stack de VPS en tu PC (Docker)

Con `deploy/.env` de prueba (`http://*.localhost:8080`): **funcionó** Postgres 17, MinIO (+ bucket público), `migrate`, `create-admin`, la **construcción de la imagen** de la app (lee la base por `host.docker.internal`) y su arranque sano. Desde la red del compose: home 200, `robots.txt` del sitio y del panel, `sitemap.xml` del panel 404, `/admin` → 307 al panel, `/api/cron/purge` 401 sin secreto y 200 con él, preflight CORS de MinIO con `PUT` + `If-None-Match`, y **la escritura condicional responde 412 al segundo `PUT`** con la misma URL firmada. **No se pudo probar Caddy ni Umami:** en esta máquina sus imágenes mueren con *segmentation fault* (incluso `caddy version` y `node -v`), problema del Docker/WSL local; el `Caddyfile` queda sin ejercitar (pruébalo en el servidor) y tampoco se pudo recorrer una subida de foto por el navegador a través de Caddy. A mitad de la sesión el motor de Docker se colgó (descargas pesadas): lo reinicié (se reiniciaron tus contenedores `guerracampal-postgres-1` y `puntillos-mariadb`; volvieron solos).

## Revisión (autorrevisión, sin revisor externo)

No lancé un revisor con contexto nuevo: el flujo de `docs/WORKFLOW.md` reserva la revisión para la sesión siguiente (Opus). Repasé yo la rama completa contra el «Review Focus»:

- **Nombre con comillas o tildes:** prueba unitaria (JSON válido, `</script>` escapado) y e2e (`Pérez Comillas` con apodo `El "Toro" </script><b>`: título, `og:title` y JSON-LD correctos).
- **Evento cancelado** → `EventCancelled`; **pasado** → indexable y `EventScheduled` (e2e).
- **Borrador:** nunca en el sitemap (prueba con borrador, programado futuro y papelera de peleador, evento y noticia) ni con JSON-LD por URL directa (e2e de peleador, evento y noticia).
- **Canónica sin filtros** y `?q=` con `noindex`; **vista previa** con `noindex` y sin JSON-LD (e2e).
- Mutaciones que hice para comprobar que las pruebas muerden: quitar `publicScope` de noticias del sitemap y quitar la regla `*.vercel.app` de `robots`; ambas hacen fallar su prueba.
- Un hallazgo propio: al volver `aria-hidden` el enlace de la foto del rival, una prueba existente (`next-bout`) falló; lo cambié por `aria-label` (el problema real era la silueta sin nombre) y agregué la prueba que faltaba.

Lo que le pido mirar con más cuidado a la revisión: `src/domain/seo.ts` (esquemas schema.org), la decisión del perfil de Lighthouse, y los textos de `docs/guia-admin.md` contra el panel real.

## Pendientes

- **Tus cuentas** (abajo): nada de eso se ejecutó.
- **Medir Lighthouse contra la URL desplegada** con fotos reales (`pnpm lighthouse -- --collect.url=…`).
- **Caddy y Umami** sin ejercitar (ver arriba); copias automáticas de Postgres e imágenes en el VPS (no las automatiza el repositorio).
- `public/og-default.jpg` y `public/logo.png` son **provisionales** (el «GC» de `Logo`); el logo oficial reemplaza ambos archivos y `Logo`.
- Los e2e en paralelo total (12 workers) tuvieron timeouts de 30 s en 4–5 specs ajenos al SEO en una corrida cargada; aislados pasan. Si se repite, bajar `--workers`.
- Pendientes anteriores sin cambiar: `/eventos`, `/peleadores`, `/rankings`, `/noticias` conservan su cabecera escrita a mano.

## Pasos que debes hacer tú con tus cuentas

Detalle en [`docs/deploy.md`](../deploy.md). En orden:

1. **Postgres** (Neon o Supabase): crear el proyecto y copiar la cadena de conexión → `DATABASE_URL`.
2. **Cloudflare R2:** bucket, dominio público `media.guerracampal.cl`, token de API, **CORS** (`PUT`/`GET`, `Content-Type` e `If-None-Match`, orígenes del panel y del sitio), **regla de encabezados** del dominio de medios (`nosniff` + `Content-Security-Policy … sandbox`), verificar que el segundo `PUT` a una URL firmada da **412**, y subir los 3 archivos de `Xenova/modnet` a `models/Xenova/modnet/`.
3. **Resend:** dominio de envío verificado y API key. **Google Cloud:** credenciales OAuth con el redirect del panel (`https://admin.guerracampal.cl/api/auth/callback/google`). (Guía: `docs/configuracion-externa.md`.)
4. Generar `BETTER_AUTH_SECRET` y `CRON_SECRET`.
5. **Vercel:** importar el repositorio, cargar las variables (tabla en `docs/deploy.md`; `SITE_URL`/`ADMIN_URL` también valen al construir), agregar `guerracampal.cl`, `www` y `admin.guerracampal.cl` al **mismo** proyecto y los registros DNS (antes del dominio propio: dos alias `*.vercel.app`), activar *Analytics*.
6. **Primer deploy**, luego `pnpm create-admin` apuntando a la base de producción con el correo de la promotora (nunca `db:seed` en producción).
7. **Prueba de humo** (lista en `docs/deploy.md` §4): `/admin` redirige al panel, login, subir foto y quitar fondo (el modelo viene del dominio de medios), crear/previsualizar/publicar un peleador, guardar el «Correo para avisos» y enviar «Quiero pelear», `sitemap.xml`/`robots.txt`, cron 401 sin secreto.
8. **Task 8:** la promotora carga el contenido real (política de privacidad, contacto con correo de avisos, redes, Nosotros, imagen para compartir); verificar el dominio en Search Console (pegando el código en Configuración → SEO) y enviar el sitemap; anuncio y `git tag v1.0.0`.
9. **Si prefieres VPS:** `docs/vps-migration.md`.

## Comandos para probar

```bash
pnpm db:migrate && pnpm dev          # sitio :3000 · panel admin.localhost:3000
pnpm test && pnpm lint && pnpm typecheck
pnpm test:e2e                        # Docker abierto; usa :3100 y .next-e2e (la caché .next-e2e/dev/cache se borra sola al arrancar)
pnpm build && pnpm start             # luego, en otra terminal:
pnpm lighthouse                      # Chrome instalado (Windows: $env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe")
```

## Qué pantallas mirar

- **Ver el `<head>` de una página** (clic derecho → Ver código fuente): home, una ficha, un evento y una noticia → título, `description`, `link rel=canonical`, `og:*`, `twitter:*` y los `<script type="application/ld+json">`. Con [validator.schema.org](https://validator.schema.org) o la «Prueba de resultados enriquecidos» de Google sobre el JSON-LD.
- `/sitemap.xml` y `/robots.txt` (sitio) y `admin.localhost:3000/robots.txt` (cierra todo).
- `/contacto`, `/nosotros`, `/privacidad` **sin contenido** (deben llevar `noindex`) y después de cargarlos en Configuración.
- Configuración → **SEO** (pegar la etiqueta de Google) e **Imagen al compartir**: comprueba que cambian `og:image` y la etiqueta de verificación en el sitio.
- La noticia con portada → `og:image` es su portada.
- `/entradas` con un tramo agotado y el pie del sitio (contraste corregido) en 375 px y 1440 px; la ficha de un peleador con un rival sin foto.
- `docs/guia-admin.md`: léela con la promotora y marca lo que no coincida con el panel.

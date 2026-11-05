# Despliegue en Vercel

Guía paso a paso para publicar Guerra Campal. Todo lo que necesita **una cuenta tuya** (Vercel, Postgres, Cloudflare, Resend, Google, el dominio) está en este documento como pasos para ti; el código ya está listo.

> **No pegues claves en el chat ni en el repositorio.** Van en las variables de entorno de Vercel (y en tu `.env` local). Lista completa y comentada: [`.env.example`](../.env.example).

## 0. Cómo funciona en producción

- **Una sola app Next.js** en un proyecto de Vercel, servida en **dos dominios**: `guerracampal.cl` (sitio) y `admin.guerracampal.cl` (panel). `src/proxy.ts` decide por dominio; `guerracampal.cl/admin` redirige al panel.
- **Postgres** externo (Neon o Supabase, **solo como Postgres**: la app no usa nada propio de ellos; la migración a otro Postgres es cambiar `DATABASE_URL`).
- **Imágenes** en un bucket S3 (Cloudflare R2) con dominio público (`media.guerracampal.cl`).
- **Correo** con Resend; **login** con email+contraseña o Google.
- **Analítica** sin cookies (Vercel Analytics), sin banner.
- El sitio público se genera estático y se actualiza solo (5 minutos como tope; las acciones del panel lo refrescan al instante). **La base de datos tiene que estar accesible y migrada durante el build** (`vercel-build` ya corre `pnpm db:migrate` antes de `next build`).

## 1. Crear los servicios (una vez)

### 1.1 Postgres (Neon o Supabase) — ~5 min
1. Crea un proyecto en [neon.tech](https://neon.tech) (o Supabase). Región cercana a la de Vercel (p. ej. `us-east-1`).
2. Copia **solo la cadena de conexión** (`postgres://usuario:clave@host/base?sslmode=require`). Si el proveedor ofrece una cadena «pooled», úsala. Será `DATABASE_URL`.

### 1.2 Bucket de imágenes (Cloudflare R2) — ~15 min
1. Cloudflare → R2 → **Create bucket** (p. ej. `guerra-campal`).
2. **Dominio público:** Bucket → Settings → **Custom Domains** → `media.guerracampal.cl` (el dominio debe estar en Cloudflare). Será `S3_PUBLIC_URL=https://media.guerracampal.cl`.
3. **Credenciales:** R2 → **Manage R2 API Tokens** → crear token con permiso *Object Read & Write* sobre ese bucket. Guarda el *Access Key ID* y el *Secret* (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`); el endpoint es `https://<account-id>.r2.cloudflarestorage.com` (`S3_ENDPOINT`), `S3_REGION=auto`, `S3_BUCKET=guerra-campal`.
4. **CORS del bucket** (Bucket → Settings → CORS policy). El navegador sube el original directo al bucket (`PUT`) y lo vuelve a leer para reeditar, recortar en vista previa y quitar el fondo (`GET`):
   ```json
   [
     {
       "AllowedOrigins": ["https://guerracampal.cl", "https://admin.guerracampal.cl"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["Content-Type", "If-None-Match"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Los orígenes son los **del panel** (de ahí sube y relee las fotos) y del sitio. Mientras uses los alias `*.vercel.app`, agrégalos también (sin barra final). Con *preview deployments* de Vercel, agrega la URL de ese preview solo si lo vas a probar.
5. **Encabezados del dominio de medios** (Cloudflare → tu dominio → Rules → **Transform Rules** → *Modify Response Header* → regla para `media.guerracampal.cl`): para que un SVG abierto directo en ese dominio no pueda ejecutar nada (igual que el driver local):
   - `X-Content-Type-Options` = `nosniff`
   - `Content-Security-Policy` = `default-src 'none'; style-src 'unsafe-inline'; sandbox`
6. **Escritura condicional (una vez, desde tu PC):** las URLs de subida son de un solo uso (`If-None-Match: *`). Verifica que R2 lo respeta: sube una foto desde el panel y, con la URL firmada de la pestaña *Red* del navegador, repite el `PUT`: debe responder **412**. Si el proveedor no lo respeta, anótalo en `docs/decisions.md` (la URL dura 15 min).
7. **Modelo de «Quitar fondo»** (~25 MB, una sola vez): descarga de [huggingface.co/Xenova/modnet](https://huggingface.co/Xenova/modnet/tree/main) `config.json`, `preprocessor_config.json` y `onnx/model.onnx`, y súbelos al bucket con esta estructura:
   ```
   models/Xenova/modnet/config.json
   models/Xenova/modnet/preprocessor_config.json
   models/Xenova/modnet/onnx/model.onnx
   ```
   Luego `NEXT_PUBLIC_MODEL_BASE_URL=https://media.guerracampal.cl/models`. (Sin la variable, el editor lo baja del Hub de Hugging Face: funciona, pero depende de un tercero.) Es una variable `NEXT_PUBLIC`: se incluye al construir.

### 1.3 Correo (Resend) y login con Google
Los dos están explicados en [`configuracion-externa.md`](configuracion-externa.md) (pasos 1 y 2). Para producción:
- **Resend:** dominio de envío verificado (`guerracampal.cl`), API key con permiso de envío → `MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM="Guerra Campal <no-reply@guerracampal.cl>"`.
- **Google:** el panel vive en `admin.guerracampal.cl`, así que el *redirect* autorizado es `https://admin.guerracampal.cl/api/auth/callback/google` (y el origen `https://admin.guerracampal.cl`). Con las dos variables `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` puestas, el botón aparece solo.

### 1.4 Secretos propios
Genera dos valores distintos (`openssl rand -base64 32` en una terminal con Git Bash/WSL, o cualquier generador de contraseñas largas):
- `BETTER_AUTH_SECRET`: firma las sesiones **y** los enlaces de vista previa (no existe `PREVIEW_SECRET`). Cambiarlo cierra todas las sesiones.
- `CRON_SECRET`: protege la limpieza diaria (`/api/cron/purge`).

## 2. Proyecto en Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio. Framework: Next.js (se detecta). Node 22 (ver `.nvmrc`). El *Build Command* lo da `package.json`: Vercel ejecuta el script **`vercel-build`** (`pnpm db:migrate && next build`) en vez de `build`.
2. **Variables de entorno** (Settings → Environment Variables, entorno *Production*; la tabla de abajo). Las que dicen «al construir» tienen que estar también durante el build (en Vercel lo están todas).
3. **Dominios** (Settings → Domains), **ambos en el mismo proyecto**:
   - `guerracampal.cl` (y `www.guerracampal.cl` con redirección al principal).
   - `admin.guerracampal.cl`.
   - **DNS** (donde administras el dominio): los registros `A`/`CNAME` que Vercel te indica para cada uno.
   - **Antes del dominio propio:** usa dos alias `*.vercel.app` (p. ej. `guerracampal.vercel.app` y `guerracampal-admin.vercel.app`, Settings → Domains → agregar) y esas URLs en `SITE_URL`/`ADMIN_URL`. Con un `SITE_URL` `*.vercel.app` el sitio queda cerrado a Google hasta el lanzamiento (`robots.txt` con `Disallow: /`).
4. **Cron:** `vercel.json` ya programa `/api/cron/purge` a diario (04:00 UTC) y Vercel envía `Authorization: Bearer <CRON_SECRET>` solo si la variable existe. El plan *Hobby* permite crons **diarios**, suficiente.

### Variables de entorno de producción

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | cadena de Postgres | al construir (migraciones + páginas estáticas) |
| `BETTER_AUTH_SECRET` | secreto propio | |
| `SITE_URL` | `https://guerracampal.cl` | **obligatoria**, también al construir |
| `ADMIN_URL` | `https://admin.guerracampal.cl` | **obligatoria**. Ya no se usa `BETTER_AUTH_URL` |
| `CRON_SECRET` | secreto propio | |
| `STORAGE_DRIVER` | `s3` | |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | del paso 1.2 | |
| `NEXT_PUBLIC_MODEL_BASE_URL` | `https://media.guerracampal.cl/models` | al construir |
| `MAIL_DRIVER` | `resend` | |
| `RESEND_API_KEY`, `MAIL_FROM` | del paso 1.3 | |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | del paso 1.3 | opcionales |
| `ANALYTICS_PROVIDER` | `vercel` | al construir. Activa también *Analytics* en el proyecto de Vercel (pestaña Analytics → Enable) |
| `ALLOW_INDEXING` | (vacía hasta el lanzamiento) | ver paso 4 |

## 3. Primer deploy y primer administrador

1. **Deploy:** *Deployments → Redeploy* (o un push). El build corre las migraciones sobre tu Postgres vacío.
2. **Nunca corras el seed en producción** (`pnpm db:seed` es solo de desarrollo: crea peleadores y eventos de mentira).
3. **Primer admin** (una vez, desde tu PC, apuntando a la base de producción; el correo es el de la promotora):
   ```bash
   DATABASE_URL="<la de producción>" BETTER_AUTH_SECRET="<la de producción>" ADMIN_URL="https://admin.guerracampal.cl" \
     pnpm create-admin correo@dominio.cl "una-clave-segura"
   ```
   (En PowerShell: `$env:DATABASE_URL="…"; $env:BETTER_AUTH_SECRET="…"; $env:ADMIN_URL="…"; pnpm create-admin correo@dominio.cl "clave"`.) Después, los demás administradores entran por **Usuarios → Dar acceso** (les llega un correo) o con Google.
4. **Preview deployments de Vercel:** tienen una sola URL cada uno, así que el panel (que vive en otro dominio) **no se puede probar ahí** salvo que le asignes un alias de panel a esa rama. Para revisar cambios del panel, usa tu PC (`admin.localhost:3000`) o el despliegue de producción.

## 4. Prueba de humo en producción

Con los alias `*.vercel.app` o ya con el dominio:

- [ ] `https://guerracampal.cl/admin` redirige a `https://admin.guerracampal.cl/` y pide ingresar.
- [ ] Ingresas con email y contraseña (y con Google, si lo configuraste).
- [ ] Subes una foto de un peleador, la reeditas (se ve la vista previa recortada) y pruebas **Quitar fondo**: en la pestaña *Red* del navegador, el modelo viene del dominio de medios (no de huggingface.co).
- [ ] Creas un peleador en **borrador**, usas **Vista previa**, lo **Publicas** y lo ves en el sitio.
- [ ] **Configuración → Contacto → Correo para avisos**: guardas tu correo. (Sin él, la Bandeja recibe los mensajes pero no sale ningún correo.)
- [ ] En el sitio, envías un «Quiero pelear»: aparece en la **Bandeja** y te llega el correo con el enlace a la bandeja del panel.
- [ ] `https://guerracampal.cl/sitemap.xml` y `https://guerracampal.cl/robots.txt` responden; `https://admin.guerracampal.cl/robots.txt` dice `Disallow: /` y `https://admin.guerracampal.cl/sitemap.xml` da 404.
- [ ] `curl -i https://guerracampal.cl/api/cron/purge` responde **401** (sin el secreto).
- [ ] Ninguna cookie en el sitio público (DevTools → Application → Cookies): la analítica no las usa.

### Rendimiento y accesibilidad contra la URL real
Con imágenes reales el LCP depende del peso de la foto de portada. Mide la URL desplegada (Chrome instalado):

```bash
pnpm lighthouse -- --collect.url=https://guerracampal.cl/ --collect.url=https://guerracampal.cl/peleadores/<slug> --collect.url=https://guerracampal.cl/eventos/<slug>
```
Presupuestos (móvil, 4G): LCP < 2,5 s, CLS < 0,1, TBT < 300 ms, Accesibilidad ≥ 95, SEO = 100 (`lighthouserc.json`). En local el margen es chico (LCP 2,3–2,4 s: con CPU lenta el primer pintado espera al JavaScript), así que mira también [PageSpeed Insights](https://pagespeed.web.dev) en móvil y, semanas después del lanzamiento, Search Console → *Métricas web principales* (datos de personas reales). En Windows, si Lighthouse no encuentra Chrome: `$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`.

## 5. Lanzamiento (cuando la promotora tenga el contenido real)

1. La promotora carga contenido desde el panel. **Obligatorio antes de abrir a Google:** Configuración → **Privacidad** (la política, Ley 19.628: qué datos piden los formularios, para qué, cuánto se guardan y cómo pedir su eliminación; los formularios enlazan a `/privacidad`), **Contacto** (con el correo de avisos), **Redes**, **Nosotros** e **Imagen al compartir**. Una página fija vacía lleva `noindex` y no sale en el sitemap hasta que tenga contenido.
2. Con el dominio propio configurado como `SITE_URL`, el sitio ya se abre a los buscadores. Si lanzas bajo un `*.vercel.app`, pon `ALLOW_INDEXING=true`.
   Cuando el dominio propio ya funcione, en Settings → Domains cambia los alias `*.vercel.app` del sitio y del panel a **Redirect to** `guerracampal.cl` y `admin.guerracampal.cl` (308): así Google no ve el sitio duplicado en el alias (que respondería un `robots.txt` abierto).
3. [Google Search Console](https://search.google.com/search-console): agrega `guerracampal.cl`, copia la etiqueta de verificación y pégala en **Configuración → SEO** del panel; verifica; envía `https://guerracampal.cl/sitemap.xml`.
4. Revisa `/rankings`, las fichas y los eventos con datos reales y corrige textos.
5. Anuncio en redes con el enlace; etiqueta `v1.0.0` en git (`git tag v1.0.0 && git push origin v1.0.0`).

## 6. Cambiar de dominio o de proveedor

- **Otro dominio:** cambia `SITE_URL`, `ADMIN_URL`, los orígenes del CORS del bucket y el redirect de Google, y vuelve a desplegar. No hay URLs escritas en el código.
- **Otro Postgres:** `pg_dump`/`pg_restore` y cambiar `DATABASE_URL`.
- **VPS propio:** [`vps-migration.md`](vps-migration.md).

## 7. Si algo falla

| Síntoma | Causa probable |
|---|---|
| El build falla con «Falta la variable de entorno SITE_URL» | `SITE_URL`/`ADMIN_URL` no están en el entorno *Production* (también se usan al construir). |
| El build falla conectando a la base | `DATABASE_URL` mal copiada o con IP restringida; el build necesita acceso al Postgres. |
| Ingresar al panel da error de origen | `ADMIN_URL` no coincide con el dominio desde el que entras (Better Auth confía solo en él). |
| Las fotos no suben (error de CORS en la consola) | Falta el origen del panel en el CORS del bucket, o falta el encabezado `If-None-Match` permitido. |
| Las fotos no suben (error de CORS) pero el CORS del bucket está bien | Las llaves `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` de Vercel están mal pegadas (p. ej. falta un carácter): R2 rechaza la firma y su respuesta de error no lleva encabezados CORS, así que el navegador lo informa como CORS. Vuelve a pegarlas completas (32 y 64 caracteres) y redespliega. Recién guardado el CORS, R2 puede tardar unos segundos en aplicarlo. |
| «Quitar fondo» tarda mucho o baja de huggingface.co | Falta `NEXT_PUBLIC_MODEL_BASE_URL` (se aplica al construir) o los archivos del modelo no están en el bucket. |
| No llegan los avisos por correo | `MAIL_DRIVER=resend` sin `RESEND_API_KEY`/`MAIL_FROM`, dominio de envío sin verificar, o falta el «Correo para avisos» en Configuración → Contacto. |
| Google ve «Disallow: /» | `SITE_URL` termina en `.vercel.app` y falta `ALLOW_INDEXING=true` (o es el dominio del panel). |

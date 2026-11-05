# Guerra Campal — Spec de diseño

Fecha: 2026-09-28 · Estado: borrador para revisión

Plataforma web para la promotora local de MMA **Guerra Campal** (Chile), inspirada en la estructura y estética de ufcespanol.com, adaptada a la identidad de la promotora. Incluye sitio público y panel de administración propio.

Maqueta visual de referencia: `maqueta/index.html` (home aprobado en estilo, contenido ficticio).

---

## 1. Decisiones globales

| Tema | Decisión |
|---|---|
| Idioma | Solo español (es-CL). URLs en español. |
| Stack | Next.js App Router (última estable) + TypeScript + Postgres + Drizzle ORM |
| Hosting inicial | Vercel (gratis) + Postgres administrado (Neon o Supabase **solo como Postgres**) |
| Hosting futuro | VPS propio con Postgres propio. Nada del código puede depender de APIs propietarias del proveedor de BD. |
| Auth | Better Auth: email+contraseña **o** Google. Acceso solo si el email está en lista blanca. Sin roles: 1–2 admins con los mismos permisos. |
| Archivos | Almacenamiento compatible S3 (Cloudflare R2 en prod; disco local en desarrollo; MinIO en VPS) detrás de una interfaz propia. |
| Email | Resend (avisos de bandeja). Detrás de una interfaz para poder cambiar proveedor. |
| Entradas | Solo links a ticketera externa + info de puntos de venta. Sin pagos. |
| Instagram/YouTube/TikTok | Embeds manuales pegando el link. Sin API de Meta. |
| Analítica | Sin cookies (Vercel Analytics o Umami). Sin banner de cookies. |
| Dominio | Sitio en `guerracampal.cl` y panel en `admin.guerracampal.cl` (mismo proyecto; el proxy decide por dominio). Antes del dominio propio: dos alias `*.vercel.app` (uno para el panel). Cambiar de dominio es solo configuración (`SITE_URL`, `ADMIN_URL`). |
| Imagen al compartir | Una imagen fija de marca (1200×630) configurable en el panel. |
| Lanzamiento | Todo junto al completar. Se desarrolla con datos de prueba (seed); la promotora carga lo real desde el panel. |
| Unidades | Métrico + imperial (kg/lb, cm/pies-pulgadas). Se guarda en métrico. |
| Disciplina | Solo MMA. Peleas pro y amateur mezcladas en un mismo evento. |

## 2. Identidad visual

- **Logo provisorio:** "GC" — G blanca, C amarilla, tipografía Anton. Logo oficial pendiente (se reemplaza un solo componente `<Logo />`).
- **Colores (tokens):**
  - `--bg #000000`, `--surface #0F0F0F`, `--surface-2 #1A1A1A`, `--border #2A2A2A`
  - `--text #FFFFFF`, `--muted #A3A3A3`
  - `--yellow #FFB400` (acento de marca, sacado del logo), `--yellow-hover #FFC633`, `--yellow-press #E0A000`
  - `--red #D7263D` y `--blue #1E6FD9` solo como marcador de esquina.
  - Texto sobre amarillo siempre negro.
- **Tipografía:** Anton (títulos, mayúsculas), Barlow Condensed 500–800 (etiquetas, cifras, navegación, mayúsculas con tracking), Barlow 400–600 (texto).
- **Lenguaje UFC adaptado:** bloques negros alternados con bloques blancos (cartelera), fotos de peleadores recortadas sin fondo, careo espejado en portadas, líneas y etiquetas de acento, bordes rectos, botones sólidos o de contorno.
- **Animaciones:** Lenis (scroll suave), GSAP + ScrollTrigger (parallax, pin horizontal, contadores), Motion para micro-interacciones de React. Todas se desactivan con `prefers-reduced-motion`.
- **Móvil primero.** Sin scroll horizontal de página en ningún ancho ≥ 320 px. El pin horizontal de peleadores solo en escritorio; en móvil es carrusel con snap.

## 3. Sitio público

Rutas:

| Ruta | Contenido |
|---|---|
| `/` | Hero del próximo evento (careo, cuenta regresiva, CTAs), marquee, cartelera resumida, noticias (principal + **Top Noticias** numeradas), carrusel "No te lo pierdas", peleadores destacados, banda de cifras, rankings resumidos, entradas, patrocinadores |
| `/eventos` | Próximos y pasados |
| `/eventos/[slug]` | Hero careo, barra fija con fecha/lugar/entradas, pestañas por bloque de cartelera, peleas en orden, horarios, mapa, resultados post-evento, galería, video, patrocinadores del evento |
| `/peleadores` | Buscador + filtros (división, nacionalidad, género, estado) |
| `/peleadores/[slug]` | Hero (etiquetas campeón/ranking/estado, apodo, nombre, bio breve, foto recortada, 3 cifras: KO/TKO, sumisión y victorias en la promotora; V-D-E del récord total si aún no pelea en la promotora), última/próxima pelea, noticias relacionadas, récord total vs en la promotora (pro y amateur separados; lo que no tiene datos no se muestra), victorias por método, historial de peleas, pestañas Datos (físico, gimnasio) y Redes, galería |
| `/rankings` | Pestañas Pro / Amateur; P4P + cada división con campeón y puestos; flechas ▲▼/NUEVO; fecha de actualización |
| `/noticias`, `/noticias/[slug]` | Listado por categoría; post con portada, texto, galería, embeds, peleadores/eventos relacionados, compartir |
| `/entradas` | Por evento: tramos y precios, link ticketera, puntos de venta, FAQ |
| `/quiero-pelear` | Formulario de postulación |
| `/patrocinar` | Formulario de contacto de patrocinio |
| `/nosotros`, `/contacto`, `/privacidad` | Páginas fijas editables desde el panel |

## 4. Modelo de dominio

### 4.1 Publicación (compartido)
Peleadores, eventos y noticias tienen `status: draft | scheduled | published`, `publish_at`, `deleted_at`.
Es público si `deleted_at IS NULL` y (`status = 'published'` o (`status = 'scheduled'` y `publish_at <= now()`)). La programación se resuelve al leer: no requiere cron.

### 4.2 Peleadores
Nombre, apellido, apodo, slug, género, fecha de nacimiento (edad calculada), nacionalidad (ISO 3166-1 alfa-2), ciudad de origen, división, peso (kg), estatura (cm), alcance (cm), guardia (ortodoxo/zurdo/switch), gimnasio, entrenador, disciplina base, bio breve (máx. 300 caracteres), estado (activo/inactivo/retirado), redes (instagram, tiktok, youtube, x), foto cuerpo entero, foto rostro, galería de fotos.
**Récord total manual** (carrera completa, incluye fuera de la promotora): V-D-E-NC pro y V-D-E-NC amateur.
**Récord en la promotora:** siempre calculado desde las peleas finalizadas; nunca se guarda.

### 4.3 Divisiones
Nombre, slug, género, límite en kg (lb calculado), orden, cantidad de puestos de ranking, activa. Seed con divisiones UFC (masculinas: Mosca 56.7, Gallo 61.2, Pluma 65.8, Ligero 70.3, Wélter 77.1, Medio 83.9, Semipesado 93.0, Pesado 120.2; femeninas: Paja 52.2, Mosca 56.7, Gallo 61.2, Pluma 65.8). Editables.

### 4.4 Eventos y cartelera
Evento: nombre, número, slug, inicio, apertura de puertas, término estimado, recinto, dirección, ciudad, coordenadas, imágenes (hero 16:9, hero móvil 4:5, póster 4:5, galería), link ticketera, tramos de precio `[{nombre, descripción, precio_clp, agotado}]`, puntos de venta, link streaming, estado del evento (`programado | en_vivo | finalizado | cancelado`).
Bloques de cartelera: nombre libre + orden + hora de inicio opcional.
Pelea: bloque, orden, esquina roja, esquina azul, división o peso pactado (kg), nivel (pro/amateur), rounds programados (3 o 5), duración del round (300 s por defecto; editable), pelea titular (sí/no).

### 4.5 Resultado de pelea
- Estado: `programada | finalizada | cancelada` (+ motivo de cancelación).
- Resultado: `red_win | blue_win | draw | no_contest`.
- Método: `ko_tko | submission | decision | technical_decision | disqualification | no_contest`.
  - KO/TKO: `ko | tko_strikes | tko_doctor | tko_corner | tko_injury`.
  - Sumisión: técnica (catálogo editable: mataleón, guillotina, triángulo, palanca de brazo, kimura, americana, D'Arce, anaconda, atadura de brazo con el cuello, estrangulación norte-sur, llave de talón, llave de tobillo, kneebar) y tipo (`tap | verbal | strikes`).
  - Decisión / decisión técnica: `unanimous | split | majority`.
  - Descalificación: motivo (lista + texto libre).
  - Sin resultado: `accidental_foul | overturned | other` + texto.
- Round de término (1..rounds programados) y tiempo en el round `mm:ss` (≤ duración del round). En decisión se autocompleta al último round y tiempo completo.
- Tiempo total = (round − 1) × duración del round + tiempo.
- Opcionales: árbitro, tarjetas de jueces `[{juez, rojo, azul}]`, bonos (`fight_of_night | performance_of_night | ko_of_night | sub_of_night`), resultado anulado (guarda el original), nota, link a video.
- Reglas de coherencia:
  - `red_win`/`blue_win` ⇒ método ≠ `no_contest`.
  - `draw` ⇒ método ∈ {`decision`, `technical_decision`}.
  - `no_contest` ⇒ método = `no_contest`.
  - Esquina roja ≠ esquina azul.
- Formato público: "Pérez vence a Soto · Sumisión (mataleón) · R2 3:42".

### 4.6 Récord calculado
Por peleador y nivel: victorias, derrotas, empates, NC; victorias y derrotas por método agrupado (KO/TKO, sumisión, decisión = decisión + decisión técnica, DQ); racha actual (tipo + cantidad, NC no corta ni suma); % de finalizaciones (victorias por KO/TKO o sumisión ÷ victorias); tiempo promedio de pelea.

### 4.7 Rankings y títulos
- Dos niveles independientes: **pro** y **amateur**, cada uno con P4P y ranking por división.
- Ranking = versión con fecha; entradas ordenadas (posición, peleador). El movimiento (▲n, ▼n, NUEVO, =) se calcula contra la versión anterior del mismo alcance.
- Campeón: uno por división y nivel; solo campeón actual (sin linaje). Puede estar vacante.
- Libra por libra: una sola lista por nivel (hombres y mujeres). Al coronar a un retador, el campeón anterior (si sigue activo) pasa al #1 de su división. Si un rankeado deja de verse (retirado, inactivo, borrador, papelera), el sitio corre los puestos (el mismo número en `/rankings`, la ficha y la cartelera) y el panel avisa para quitarlo.
- El campeón no ocupa número en su división. Un peleador puede estar en su división y en P4P.
- Solo peleadores activos; si pasan a inactivo/retirado, el panel avisa.
- Sugerencias tras cargar resultados: si un ganador vence a alguien mejor rankeado, sugerir moverlo a la posición del perdedor; si gana un no rankeado a un rankeado, sugerir entrada. El admin acepta o descarta cada una.
- Cambio de título: si en pelea titular gana el retador, el panel pide confirmar el nuevo campeón. Botón "dejar vacante".
- Visibilidad por nivel: "Ocultar del sitio" / "Mostrar en el sitio". Oculto (lo normal en una instalación nueva), el panel edita todo y el público no ve rankings ni campeones de ese nivel. Los campeones visibles llevan insignia ("Campeón"/"Campeona") en el listado de peleadores y en su ficha.

### 4.8 Noticias
Título, slug, bajada, portada 16:9, cuerpo en texto enriquecido (Tiptap JSON) con embeds de Instagram/YouTube/TikTok/Facebook por URL, galería, categoría (catálogo editable: Anuncios, Resultados, Entrevistas, Detrás de cámaras), peleadores y eventos relacionados.
Fecha de una noticia = el momento en que se publica (o la fecha programada). La home muestra como principal la destacada más reciente o, sin destacada, la más reciente.
Panel: dos publicadores para el cuerpo — el editor y «Con IA» (se copia un prompt para una IA externa, sin API, y se pega su respuesta en un formato fijo: título, bajada, `##`, listas, citas, `[FOTO N]`, link de una red solo en su línea) — y una vista previa en vivo bajo el formulario, en celular (375 px) y PC (1440 px), dibujada con los mismos componentes de la página pública. En el panel las publicaciones de redes se ven con el reproductor real; en el sitio, como fachada que no carga el reproductor de la red hasta el clic (YouTube muestra antes su imagen fija, servida por `i.ytimg.com` sin cookies; el resto, un recuadro con la marca). Videos solo vía YouTube, Instagram, TikTok o Facebook (no se suben archivos de video).

### 4.9 Patrocinadores
Nombre, logo (SVG/PNG sin fondo, caja 2:1), link, nivel (`principal | oficial | colaborador`), orden, vigencia (desde/hasta, se ocultan solos), alcance (todos los eventos o eventos específicos). Ubicaciones: home (principal + oficial), página de evento (todos los niveles), footer (solo principal). Un patrocinador de eventos específicos solo sale en la página de esos eventos; la home y el footer muestran solo a los de todos los eventos. La vigencia se cuenta en días de Chile (el último día vale hasta la medianoche).

### 4.10 Bandeja
Postulaciones "Quiero pelear" (nombre, email, teléfono, fecha de nacimiento, peso, récord, gimnasio, links de video, mensaje, consentimiento) y contactos de patrocinio (empresa, contacto, email, teléfono, mensaje). Estados `new | contacted | discarded`. Cada envío notifica por email a la promotora. Protección anti-spam: campo trampa + límite por IP.

### 4.11 Configuración del sitio
Textos de Nosotros, Contacto, Privacidad, FAQ de entradas, redes, email, WhatsApp, footer, imagen para compartir.

## 5. Imágenes

| Tipo (`kind`) | Proporción | Recomendado | Mínimo | Formato |
|---|---|---|---|---|
| `fighter_body` | 2:3 | 1200×1800 | 800×1200 | PNG sin fondo |
| `fighter_headshot` | 1:1 | 800×800 | 400×400 | JPG/PNG |
| `event_hero` | 16:9 | 1920×1080 | 1280×720 | JPG |
| `event_hero_mobile` | 4:5 | 1080×1350 | 720×900 | JPG |
| `event_poster` | 4:5 | 1080×1350 | 720×900 | JPG |
| `news_cover` | 16:9 | 1600×900 | 1200×675 | JPG |
| `gallery` | libre | lado largo 2400 | lado largo 1200 | JPG |
| `sponsor_logo` | caja 2:1 | 600×300 o SVG | 300×150 | SVG/PNG sin fondo |
| `og_image` | 1.91:1 | 1200×630 | 1200×630 | JPG |

- Máx. 15 MB por archivo. Bajo el mínimo: advertencia, se permite subir.
- Editor: recorte con proporción fija (mover, zoom, rotar), vista previa en vivo en los contextos reales (tarjeta, hero, móvil), punto de enfoque, brillo/contraste/saturación, botón "Quitar fondo" (IA en el navegador, licencia permisiva).
- Servidor: guarda original; genera variantes WebP (anchos 400, 800, 1200, 1920 según tipo) aplicando recorte y ajustes; SVG se guarda tal cual (sanitizado).

## 6. Panel de administración

- El panel vive en su subdominio: `admin.guerracampal.cl` (`ADMIN_URL`); el sitio público, en `guerracampal.cl` (`SITE_URL`). Las rutas del panel se escriben sin `/admin` en el navegador (`admin.guerracampal.cl/peleadores`); en el código viven en `src/app/admin` y el proxy traduce. `/admin/...` en el sitio público redirige al subdominio. La sesión solo existe en el subdominio.
- Login: `admin.guerracampal.cl/login`. Email+contraseña o Google; ambos filtrados por lista blanca (`allowed_emails`). Primer admin por script de seed. Recuperar contraseña por email.
- Secciones: Inicio (próximo evento, bandeja nueva, borradores, programados, accesos rápidos), Peleadores, Divisiones, Eventos (datos + armador de cartelera con arrastrar y soltar + resultados), Noche de pelea (móvil), Noticias, Rankings y títulos, Patrocinadores, Bandeja, Configuración, Usuarios (lista blanca), Papelera (30 días), Historial de cambios.
- Todo contenido: borrador / programado / publicado + vista previa.
- **Noche de pelea** (`/admin/eventos/[id]/en-vivo`): pantalla móvil, pelea actual, botones grandes Roja/Azul/Empate/NC, método, round, tiempo, guardar ⇒ web pública actualizada en ≤ 30 s; avanza a la siguiente pelea. Evento pasa a `en_vivo` al abrir y a `finalizado` al cerrar la última pelea.
- Papelera: borrado lógico; purga automática tras 30 días (cron diario).
- Historial: cada acción de escritura registra actor, acción, entidad, resumen, fecha.

## 7. SEO y lanzamiento

- Metadatos por página (`generateMetadata`), URLs limpias, canonical.
- `sitemap.xml` y `robots.txt` dinámicos.
- JSON-LD: `SportsEvent` (eventos), `Person` (peleadores), `NewsArticle` (noticias), `Organization` (home).
- Open Graph con la imagen fija de marca; las noticias con portada usan su portada.
- Google Search Console (verificación por meta tag configurable).
- Política de privacidad (Ley 19.628; alinear con Ley 21.719, vigente desde dic 2026) + casilla de consentimiento en formularios.
- Rendimiento: LCP < 2.5 s en 4G para home y ficha; imágenes con `next/image` y variantes propias.

## 8. Fuera de alcance (v1)

Venta de entradas propia, estadísticas de golpes/derribos, linaje de cinturones, cinturones interinos, newsletter, streaming embebido propio, multi-idioma, roles de admin, feed automático de Instagram.

## 9. Descomposición en planes

| # | Plan | Depende de |
|---|---|---|
| 00 | Fundación: proyecto, BD, auth + lista blanca, sistema de diseño, layouts, publicación, auditoría, papelera | — |
| 01 | Medios: almacenamiento, subida, procesamiento, editor de imagen, quitar fondo | 00 |
| 02 | Peleadores y divisiones (+ récord calculado) | 00, 01 |
| 03 | Eventos, cartelera, resultados, noche de pelea, entradas | 00, 01, 02 |
| 04 | Noticias | 00, 01, 02, 03 |
| 05 | Rankings y títulos | 02, 03 |
| 06 | Home, patrocinadores, bandeja/formularios, configuración, páginas fijas, dashboard | 00–05 |
| 07 | SEO, analítica, rendimiento y lanzamiento | 00–06 |

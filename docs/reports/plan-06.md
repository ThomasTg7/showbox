# Reporte — Plan 06 · Home, patrocinadores, bandeja, configuración y dashboard

Rama `plan-06` (desde `main`, que ya incluía el Plan 05 revisado). Ejecutado con `superpowers:executing-plans` (inline, Sonnet). Un commit por tarea (más dos correcciones al final). **No se hizo merge ni push**, ni se empezó el Plan 07. No se lanzó un revisor con contexto nuevo: la revisión (Opus) es la fase siguiente de `docs/WORKFLOW.md`; abajo, en «Revisión», lo que miré yo.

## ⚠️ Antes de abrir el sitio: migra tu base de desarrollo

Hay **4 migraciones nuevas (0015 a 0018)** y las páginas públicas ya leen las tablas nuevas (el footer lee la configuración en cada página). Hasta que corras `pnpm db:migrate`, tu `pnpm dev` en `:3000` (que sigue la rama que está abierta en la carpeta) da error en todo el sitio. Después, `pnpm db:seed` agrega los patrocinadores de demostración (no pisa nada).

`pnpm build` **prerenderiza** `/`, `/contacto`, `/nosotros`, `/privacidad`, `/quiero-pelear`, `/patrocinar` y `/entradas` leyendo la base: necesita una base migrada. Con la tuya sin migrar falla («relation "site_settings" does not exist»); lo verifiqué contra la base de e2e.

## Tareas completadas

| Tarea | Resultado |
|---|---|
| 1 Configuración | `site_settings` (migración 0015), registro Zod por clave (`about`, `contact`, `socials`, `ticketsFaq`, `privacy`, `footer`, `share`, `seo`), `getSetting`/`getAllSettings`/`saveSetting`/`getCachedSetting`/`getCachedShareImage`; `/configuracion` con 8 pestañas; `PostEditor` en modo restringido (`allowMedia`, `media: false`, `validatePostBody(…, { allowMedia: false })`); `share.ogMediaId` en `MEDIA_REFERENCES` |
| 2 Páginas fijas y footer | `/nosotros`, `/contacto`, `/privacidad` (con «Actualizado el …»), footer con redes, frase y dirección de la configuración, FAQ de `/entradas` (`<details>`, sin preguntas no se dibuja); `PageShell`/`PageHeader`/`PageEmpty`; e2e `static-pages` |
| 3 Patrocinadores | migración 0016 (`sponsors`, `sponsor_events`), `isSponsorActive` (días de Chile), `listSponsorsFor`, admin con orden por arrastre y botones y selector de eventos, papelera, `SponsorStrip`/`SponsorGrid`/`SponsorLogo`, en la home, el evento y el footer, `seedSponsors`; e2e `admin-sponsors` |
| 4 Formularios públicos | migración 0017 (`inbox_messages`, `form_rate_limits`), `/quiero-pelear` y `/patrocinar` (`<form action>`, funcionan sin JS), campo trampa, 5 envíos por IP por hora, aviso por correo que no pierde el mensaje si falla; e2e `inbox-forms` |
| 5 Bandeja | `/bandeja` (filtros por tipo y estado en la URL) y `/bandeja/[id]` (responder por email, WhatsApp, estados), aviso de nuevos en la barra lateral; e2e `admin-inbox` |
| 6 Home | migración 0018 (`posts.has_media` + relleno), `getHomeData`/`buildHomeData`, `getHomeStats`, `pickHighlights`, `listPublicFighterCardsByIds`, `listDontMissPosts`; portada, cinta, cartelera resumida, noticias, «No te lo pierdas», peleadores fijados (≥ 901 px), cifras, rankings Pro/Amateur, entradas, patrocinadores, presentación inicial; e2e `home` |
| 7 Dashboard | `getDashboard`, tarjeta del próximo evento con cuenta regresiva y «Abrir noche de pelea», bandeja, borradores, programados, avisos de ranking, accesos rápidos; e2e `admin-dashboard` |

## Desviaciones

Todas en [`docs/decisions.md`](../decisions.md) → «Ejecución del Plan 06 (Sonnet)». Las que más afectan a lo siguiente:

- **`getHomeData()` no recibe `db`:** compone lecturas cacheadas (que no corren sobre PGlite), así que `buildHomeData(sources)` recibe las lecturas; producción pasa las cacheadas. [Task 6](../decisions.md)
- **Un patrocinador atado a eventos específicos solo sale en esos eventos** (no en la home ni el footer). El spec no lo decía. [Task 3](../decisions.md)
- **`playwright.config.ts`: `webServer.url` = `/favicon.ico`.** Playwright levanta el servidor antes del `globalSetup`; una página que lee tablas nuevas devolvía 500 y el servidor nunca quedaba «listo» tras cada migración nueva. [Task 3](../decisions.md)
- **Solo los envíos válidos gastan el cupo de 5 por hora**; los dos formularios comparten el cupo. [Task 4](../decisions.md)
- **La home reutiliza** `EventHero`, `BoutAccordion`/`FightCardTabs`/`BoutRow`, `TicketTiers`, `PostCard`+`TopNews`, `RankingCard`, `FighterCard` (nueva prop `heading`) en vez de crear tarjetas propias; el movimiento al scroll es un `IntersectionObserver` que no esconde nada antes de hidratar ni con «reducir movimiento». [Task 6](../decisions.md)
- **Dos trampas nuevas** (en `docs/convenciones.md` → «Home, sitio y configuración»): el `Switch` de Radix se reinicia con `<form action>`; un efecto con memoria externa se monta dos veces en desarrollo.

## Revisión (autorrevisión, sin revisor externo)

Repasé el «Review Focus» del plan: sin evento próximo la home muestra el último finalizado o el bloque «Próximamente» (prueba con base de prueba para los 3 casos); si Resend falla el mensaje queda guardado y la persona ve el éxito (prueba del servicio) y, además, una configuración de correo incompleta tampoco lo pierde (`getLazyMailer`, lo encontré al repasar: arreglado y probado); un patrocinador que vence hoy sigue visible hasta medianoche de Chile (prueba con `now` a las 23:30 de Chile, ya el 25 en UTC); los dos formularios se envían con JavaScript desactivado (e2e); un texto vacío de configuración oculta su sección (FAQ en e2e, páginas con aviso). Método: en algunas piezas chicas (dominio de patrocinadores, `form-input`, `highlights`) escribí la implementación junto al test sin correr antes el rojo; los tests igual describen el comportamiento, pero conviene que el revisor mire `service.test.ts` y `queries.test.ts` de sponsors e inbox.

Lo que le pido mirar con más cuidado a la revisión: el límite por IP confía en `x-forwarded-for` (bien en Vercel; detrás de otro proxy hay que confirmarlo); el relleno de `has_media` en la migración 0018 (SQL a mano, `jsonb_path_exists`, verificado con filas de ejemplo); y `PinnedTrack` (GSAP + Lenis) en un celular real.

## Verificación

`pnpm test` 120 archivos / 1011 pruebas, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` (180 pruebas: 179 a la primera y la que falló, `admin-inbox` en celular, era una corrida con la página transmitiéndose dos veces: ya usa `.first()` y pasó 20 de 20 repetida) y `pnpm build` (con `DATABASE_URL` de la base de e2e, porque la de desarrollo no está migrada): todo en verde. La home sale estática con revalidación de 5 min. Si `pnpm test:e2e` dice que no encuentra `dockerDesktopLinuxEngine`, abre Docker Desktop (a mitad de la sesión estaba cerrado y lo abrí).

## Pendientes

- **Tu base de desarrollo:** `pnpm db:migrate` y `pnpm db:seed` (ver arriba). No toqué tu `pnpm dev`.
- **Plan 07:** leer `getCachedSetting("seo")` (verificación de Google) y `getCachedShareImage()` (imagen para compartir): se guardan, pero ningún `<head>` los usa todavía; agregar al sitemap `/nosotros`, `/contacto`, `/privacidad`, `/quiero-pelear`, `/patrocinar`; metadatos y JSON-LD de la home.
- Probar el correo real con Resend (`MAIL_DRIVER=resend`); en desarrollo el aviso se imprime en la terminal de `pnpm dev`.
- `/eventos`, `/peleadores`, `/rankings` y `/noticias` conservan su cabecera escrita a mano (usar `PageHeader` cuando se toquen).
- «Todo el plantel» no muestra cuántos peleadores hay (ninguna lectura lo da).
- Pendientes anteriores sin cambiar: ver «Pendiente sin cambiar» del Plan 03.

## Comandos para probar

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm test && pnpm lint && pnpm typecheck
pnpm test:e2e
DATABASE_URL=<una base migrada> E2E_DIST_DIR=.next-e2e pnpm build
```

Si cambias código de una lectura cacheada y vuelves a correr los e2e, borra antes `.next-e2e/dev/cache`.

## Qué mirar (375 px y 1440 px)

Sitio (`localhost:3000`):
- **Home (`/`):** portada «Pérez vs Soto» con cuenta regresiva; cinta amarilla inclinada; cartelera resumida con pestañas y «Ver datos»; Noticias con «Top Noticias»; «No te lo pierdas» con flechas; **Peleadores** (a 1440 px la sección se fija y avanza en horizontal; a 375 px es un carrusel con imán) con «Campeón»/«#1» y la letra o número grande de fondo; banda amarilla de cifras (cuentan al llegar); Rankings con selector Pro/Amateur; «Asegura tu lugar» (en celular, los tramos en un bloque amarillo); cinta de patrocinadores (se detiene al pasar el mouse). La presentación «GC» solo se ve la primera vez de la sesión. Con «reducir movimiento» nada se anima ni espera.
- **`/quiero-pelear` y `/patrocinar`:** errores en línea, lo escrito no se pierde, «Enviado»; en celular el botón mide ≥ 44 px.
- **`/nosotros`, `/contacto`, `/privacidad`, `/entradas`** (FAQ), **footer** (redes, frase, patrocinador principal) y la página de un evento (sección de patrocinadores).

Panel (`admin.localhost:3000`):
- **Inicio:** próximo evento con cuenta regresiva y «Abrir noche de pelea», bandeja, borradores, programados y accesos rápidos (en celular, la bandeja va justo bajo el evento).
- **Configuración:** las 8 pestañas (editor de Nosotros/Privacidad sin fotos ni videos, FAQ con subir/bajar, imagen para compartir).
- **Patrocinadores:** crear con logo SVG/PNG, vigencia, alcance por evento, ordenar arrastrando o con botones, enviar a la papelera.
- **Bandeja:** enviar una postulación desde el sitio y verla «Nuevo» (con el número en la barra lateral), responder por correo/WhatsApp y marcarla «Contactado».

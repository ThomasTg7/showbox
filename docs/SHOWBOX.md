# ShowBox Promotions — identidad y adaptación a boxeo

Copia independiente de la plataforma de Open Fight Latam (MMA). La arquitectura, el panel, la seguridad (`requireAdmin`, Zod, auditoría), la papelera, los medios, el SEO, la caché y las animaciones se conservan. Cambian la identidad visual, el dominio deportivo (boxeo en vez de MMA) y la localización (Ecuador).

## Identidad visual

Tomada del logo y los afiches entregados por la promotora (velada «Quorum Quito Fight Night XV», afiches de Padilla vs Jiménez y de Kleber Santin).

| Token | Valor | Uso |
|---|---|---|
| Negro | `#000000` | fondos, navegación, escenario de los afiches |
| Rojo ShowBox (logo) | `#FF1226` (`brand-bright`) | «BOX» del logo, acentos, texto rojo sobre negro (5,4:1) |
| Rojo de botón | `#E3101F` (`brand`) | fondos con texto blanco (4,8:1, AA) |
| Rojo ladrillo | `#8E1B17` (`brand-ember`) | rótulos de afiche («K L E B E R», «8-1-1», nombre del evento) |
| Acento | `#FF3B47` | enlaces y etiquetas sobre negro |
| Plata | degradado blanco → `#BDBDBD` | «SHOW» del logo; apellidos y titulares grandes (`.sb-chrome-text`) |

**Tipografías** (Google Fonts, vía `next/font`):

- **Archivo** (variable en ancho y peso): titulares gigantes anchos y pesados como «SANTIN» / «PADILLA VS JIMENEZ» (`font-display`, `wdth 108`, `wght 900`) y datos condensados (`font-cond`, `wdth 78`). La fecha de afiche «SÁBADO - 14 - NOVIEMBRE» usa la misma familia en cursiva condensada (`.sb-poster-date`).
- **Montserrat**: lectura, formularios y las líneas espaciadas del recinto («Q U O R U M  P A S E O …», `.sb-spaced`).

**Recursos de marca:** `public/showbox-logo.webp` y `public/showbox-wordmark.webp` (recortados con fondo transparente del logo entregado), `public/og-default.jpg`, `public/logo.png` y `src/app/favicon.ico`.

**Escenario de afiche** (`ArenaBackdrop`, `src/components/brand/arena-backdrop.tsx`): humo rojo/negro, hileras de focos del techo que titilan solo con opacidad y grano de película (ruido SVG en CSS, sin imágenes). `BrandMark` dibuja los cortes diagonales rojos de los afiches. Todo respeta «reducir movimiento».

**Piezas con estilo de afiche:**

- Portada del evento: logo arriba, nombre del evento en rótulo rojo, apellidos cromados con entrada «punch-in», fecha en cursiva condensada, recinto espaciado, focos y grano.
- Ficha del boxeador: nombre en rótulo rojo espaciado, apellido gigante cromado y barra roja con el récord (W-L-D), como el afiche de Santin.
- Botones con barrido diagonal; subrayado de navegación sesgado; rankings con degradado rojo.

Las clases CSS propias usan el prefijo `sb-` (`src/app/showbox-public.css`, `showbox-motion.css`, `showbox-admin.css`).

## Boxeo en vez de MMA

- **Métodos de resultado:** KO/TKO, decisión, decisión técnica, descalificación y sin resultado. Se quitaron la sumisión, el catálogo de técnicas de sumisión (tabla, panel `/eventos/tecnicas`, consultas, caché) y el bono «Sumisión de la noche».
- **Tipos de KO/TKO:** KO, TKO (detención del árbitro), TKO (detención médica), **RTD (retiro en la esquina)** y TKO (lesión).
- **Rounds:** 3 (amateur), 4, 5, 6, 8, 10 o 12 (títulos). Rounds de 3 minutos por defecto, 1 a 5 minutos (2 en muchas peleas femeninas). Por defecto una pelea nueva es a 6 × 3 min.
- **Tarjetas de los jueces:** sistema de 10 puntos, hasta 120 por tarjeta (12 rounds).
- **Récord y cifras:** sin conteo de sumisiones; el porcentaje de definición es el de nocauts. La ficha muestra KO/TKO, decisiones y victorias. La banda de cifras de la home muestra eventos, peleas, rounds disputados y KO/TKO.
- **Divisiones:** las 17 categorías del boxeo profesional (Mínimo a Pesado, con límites oficiales en kg) y 8 femeninas (Minimosca a Wélter). Se activan/editan desde el panel.
- **Textos:** «boxeador/boxeadora» en vez de «peleador» (también en las rutas: `/boxeadores`), «velada», «estilo de pelea» en vez de «disciplina base».
- **Base de datos:** migración inicial nueva (`drizzle/0000_showbox_init.sql`) con el esquema de boxeo; una instalación nueva parte de cero.

## Ecuador

- Zona horaria fija `America/Guayaquil` (UTC−5, sin horario de verano) y formato `es-EC` (`src/lib/format-date.ts`, `src/lib/local-time.ts`).
- Precios en dólares (USD) enteros. El campo de los tramos de entradas se sigue llamando `priceClp` por herencia del esquema (solo el nombre interno).
- WhatsApp: un celular escrito sin código de país lleva el `593`.
- Datos de ejemplo: veladas «ShowBox Fight Night 1–5» en el Quorum Paseo San Francisco (Quito) y 12 boxeadores **ficticios** (no son personas reales).

## Pendiente para la promotora

- Cargar fotos reales de boxeadores, portadas y afiches de cada velada (el sitio usa siluetas mientras tanto).
- Redes sociales y contacto en Configuración (no se inventaron perfiles).
- Dominio, correo y despliegue según `docs/deploy.md`.

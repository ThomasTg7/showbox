# Reporte — Plan 03 · Eventos, cartelera, resultados y entradas

Rama `plan-03` (desde `main`). Ejecutado con `superpowers:executing-plans` (inline, Sonnet). Un commit por tarea, más una pasada de correcciones tras la revisión de toda la rama (revisor Opus con contexto nuevo).

## Tareas completadas

| Tarea | Resultado |
|---|---|
| 1 Reglas de resultado | `src/domain/{bout-result,bout-enums,clock}.ts`: `validateBoutResult` (método/resultado coherentes, tiempo `m:ss`, decisión completa round y tiempo), `parseClock`, `formatResultLine`, `suggestDecisionType` |
| 2 Esquema y lecturas | tablas `events`, `card_segments`, `bouts`, `submission_techniques`, galería del evento (migración 0008); lecturas públicas/panel repartidas por archivo; «Próximos» con margen de 12 h; seed con fechas relativas |
| 3 Servicios y acciones de cartelera | eventos (crear, editar, duplicar, publicar, papelera), bloques y peleas (mover entre bloques con `sort_order` contiguo, cancelar, reponer), reglas de doble reserva, `withEventRevalidation` |
| 4 Resultados | `recordBoutResult` (guardar/corregir con auditoría de diff), borrar y anular, orden de la noche, el evento se finaliza solo |
| 5 Panel de eventos | listado (tarjetas en móvil), formulario de 5 pestañas, armador de cartelera (arrastrar entre bloques + botones), formulario de resultado, técnicas de sumisión |
| 6 Noche de pelea | `/eventos/[id]/en-vivo`: consola de una mano en celular (botones ≥ 56 px, teclado numérico para el tiempo), avanza sola, corregir desde la lista |
| 7 Página pública del evento | `/eventos` (Próximos/Pasados), `/eventos/[slug]` (hero con careo, cartelera por bloques en el HTML, cuenta regresiva, barra fija, mapa, galería, video, en vivo con refresco), vista previa firmada |
| 8 Ficha del peleador | récord calculado por nivel, historial con filtro, próxima/última pelea, cifras del hero (KO/TKO, Sumisión, Victorias), galería propia (migración 0009) |
| 9 Entradas | `/entradas`: tramos con precio en pesos, «AGOTADO», ticketera y puntos de venta |

## Desviaciones

Todas en [`docs/decisions.md`](../decisions.md) → «Ejecución del Plan 03 (Sonnet)» (una entrada por tarea) y las dos últimas, «[Plan 03 · Revisión final]». Las que más afectan a lo siguiente:

- **Abrir la consola ya no pone el evento en vivo si falta más de 12 h para su inicio** (spec §6 decía «al abrir»): antes hay un botón «Abrir la noche de pelea». Razón: el botón está en cada fila del listado y una mirada anticipada dejaba el sitio en «EN VIVO».
- Un evento en vivo se cachea 10 s (no 300 s) para que la página en vivo no muestre datos viejos tras una carrera con la invalidación.
- Reglas extra que el plan no traía: una pelea cancelada libera a sus peleadores (y al reponerla se vuelve a comprobar), una pelea con resultado no se edita/cancela/elimina sin borrar el resultado, `deleteFighter` rechaza a quien tiene peleas.
- La pelea estelar es la primera **no cancelada** (`pickMainBout`).
- El seed de demostración se rehízo: Matías Pérez sin peleas terminadas en la promotora (sus pruebas del Plan 02 valen), Diego Soto con tres (2-1-0). El seed de desarrollo se recreó borrando solo los 5 eventos sembrados.
- Un e2e del Plan 02 (`admin-fighters`, restaurar de la papelera) tenía una carrera; ahora espera el aviso.

## Revisión de la rama (Opus, contexto nuevo)

Sin errores críticos. Cuatro importantes corregidos (con prueba escrita antes): reponer una pelea sin recomprobar la doble reserva; cancelar o eliminar la última pelea pendiente dejaba el evento «En vivo»; el formulario del evento podía devolver el estado (`eventStatusBefore`); abrir la consola antes de tiempo ponía el evento en vivo. Se subieron de grado y se corrigieron: «Borrar resultado» sin confirmación y la estelar cancelada que seguía encabezando el sitio. Detalle en `docs/decisions.md`.

## Pendientes

Listados con detalle en `docs/decisions.md` → «[Plan 03 · Revisión final] Pendiente sin cambiar»:

- Serializar por evento las escrituras de cartelera y resultados (`SELECT … FOR UPDATE`): dos admins a la vez podrían repetir `sort_order` o doble-reservar a un peleador. Lo mismo entre `deleteFighter` y `addBout`.
- `getCachedFighterBouts` sin la etiqueta de la lista de peleadores (nombres viejos hasta 5 min al renombrar a un rival).
- La consola en vivo no muestra de nuevo una pelea cuyo resultado se borró con «Corregir» hasta recargar.
- Volver a guardar una pelea con resultado anulado descarta `overturned_from`.
- Las horas de inicio de cada bloque no se reanclan al cambiar la fecha del evento o duplicarlo.
- `dnd-kit` importado de forma estática en el armador (CLAUDE.md pide diferirlo); `card-service.ts` ~330 líneas.
- Detalles menores de accesibilidad y pruebas débiles (ver la entrada).
- **Plan 05:** confirmar el cambio de título comparando con el campeón guardado (`titleChange` nace solo si gana el retador —la esquina contraria a `championCorner`— y una corrección posterior no lo retira); llenar `data-slot="bout-rank"` y `fighter-tags`. **Plan 06:** FAQ en `data-slot="tickets-faq"`; `getNextEvent` puede devolver un evento cancelado con fecha futura. **Plan 04:** `fighter-news`.
- Los 44 px táctiles se revisaron a mano (Playwright no emula `pointer: coarse`), no en el e2e.
- El e2e del refresco en vivo espera hasta 60 s: con el servidor de desarrollo muy cargado puede tardar.

## Verificación

Todo en verde al cerrar: `pnpm test` (550 tests, 70 archivos), `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` (85 tests) y `E2E_DIST_DIR=.next-e2e pnpm build`.

## Cómo probar

```bash
pnpm db:migrate   # migraciones 0008 (eventos) y 0009 (galería del peleador); ya aplicadas a la base de desarrollo
pnpm db:seed      # 5 eventos de ejemplo (GC 1–5) y el catálogo de técnicas
pnpm dev          # o el que ya tienes abierto en :3000
```

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm test:e2e
```

## Qué mirar (en 375 px y 1440 px)

Panel (`http://admin.localhost:3000`):
1. `/eventos`: tarjetas en móvil y tabla en PC; «Noche de pelea», «Cartelera», «Duplicar», «Papelera»; filtro de publicación.
2. `/eventos/nuevo`: enviar vacío (errores junto al campo y punto rojo en la pestaña), fecha y hora de Chile, tramos de entradas (precio «15.000»), botón fijo abajo en móvil.
3. `/eventos/<id>/cartelera` (abrir «Cartelera» de Guerra Campal 5): arrastrar una pelea a otro bloque, los botones subir/bajar y «Mover a…», cancelar y reponer, «Resultado» de una pelea.
4. `/eventos/<id>/en-vivo` con Guerra Campal 5 (dentro de semanas): muestra «La noche de pelea aún no empieza» con el botón; al abrirla, guardar resultados con una mano y ver cómo avanza a la siguiente pelea. Ojo: abrirla deja el evento «En vivo» en el sitio hasta que guardes todos los resultados (o lo devuelvas a «Programado» en «Editar evento»).
5. `/eventos/tecnicas`: agregar, renombrar, ordenar y borrar (solo las sin usar) técnicas.

Sitio público:
1. `/eventos`: «Próximos» (Guerra Campal 5) y «Pasados» (1–4, paginado); estado vacío si no hubiera próximos.
2. `/eventos/guerra-campal-5`: careo de la estelar, cuenta regresiva, cartelera por bloques (pestañas), horarios, mapa, barra fija de entradas al bajar. En vivo se refresca sola.
3. `/eventos/guerra-campal-4`: resultados de cada pelea, sin cuenta regresiva ni entradas. Una vista previa (`Vista previa` en el formulario del panel) abre el borrador con aviso y `noindex`.
4. `/entradas`: tramos con precio en pesos, «AGOTADO» sin enlace, «Ir a la ticketera» en otra pestaña.
5. `/peleadores/diego-soto` (historial, récord en Guerra Campal, cifras del hero y próxima pelea), `/peleadores/matias-perez` (sin peleas terminadas: conserva las cifras manuales) y `/peleadores/nicolas-ibarra`.

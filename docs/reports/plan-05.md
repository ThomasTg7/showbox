# Reporte — Plan 05 · Rankings y títulos

Rama `plan-05` (desde `main`). Ejecutado con `superpowers:executing-plans` (inline, Sonnet). Un commit por tarea. **No se hizo merge ni push**, ni se empezó el Plan 06. La revisión con contexto nuevo (Opus) queda para la fase de revisión de `docs/WORKFLOW.md`; aquí solo hubo una autorrevisión del autor (ver «Revisión»).

## Tareas completadas

| Tarea | Resultado |
|---|---|
| 1 Dominio | `src/domain/rankings.ts`: `computeMovement`, `suggestAfterEvent` (textos exactos del plan), `validateRanking`, y además `applySuggestion`, `rankingScopeKey`, `P4P_SLOTS` |
| 2 Esquema, consultas y acciones | migración 0013 (`ranking_versions`, `ranking_entries`, `titles`, `dismissed_suggestions` con sus índices); `service.ts` (`saveRanking`, `setChampion`, `vacateTitle`, `dismissSuggestion`), `getPublicRankings`, `getFighterRankingTags`, `getBoutRankLabels`, `listIneligibleWarnings`; `revalidateFighter` expira también `rankings`; `deleteFighter` rechaza a campeones y rankeados; `seedRankings` |
| 3 Cambio de título | `TitleChangeDialog` en el resultado y en la consola de noche; compara contra el campeón guardado; e2e `title-change` |
| 4 Admin | `/rankings` (Pro/Amateur, alcances, avisos) y `/rankings/<nivel>/<p4p\|división>` (borrador ordenable, buscador de elegibles, sugerencias, campeón); e2e `admin-rankings` |
| 5 Sitio público | `/rankings`, `RankingCard`, `MovementBadge`, etiquetas de campeón/puesto en la ficha y `C`/`#n` en la cartelera; `FighterCard` con `backdrop`; e2e `rankings-public` |

## Desviaciones

Todas en [`docs/decisions.md`](../decisions.md) → «Ejecución del Plan 05 (Sonnet)». Las que más afectan a lo siguiente:

- **`setChampion` también guarda la versión del ranking** (saca al nuevo campeón; el excampeón queda #1 si sigue elegible). [Task 2](../decisions.md)
- **`ON DELETE CASCADE`** (no `restrict`) en `ranking_entries.fighter_id`, para que la purga de la papelera no falle por versiones viejas. [Task 2](../decisions.md)
- **Libra por libra = una lista** (hombres y mujeres): el alcance del plan no distingue género. [Task 2](../decisions.md)
- **El editor busca elegibles por action** (no recibe `eligibleFighters`). [Task 4](../decisions.md)
- **Los e2e usan divisiones y peleadores propios** (Medio, Semipesado, Pesado); el seed (Pérez campeón, Soto #1) queda intacto. [Task 3](../decisions.md)
- **Dos trampas encontradas por los e2e:** `row_number()` es `bigint` (texto en postgres.js, número en PGlite) y la caché de `unstable_cache` de `.next-e2e` persiste entre corridas. [e2e](../decisions.md)

## Revisión (autorrevisión, sin revisor externo)

No se lanzó un revisor con contexto nuevo (no se pidió). Repasé los cinco puntos de «Review Focus»: primera versión = todos NUEVO (e2e público y consulta); retirado rankeado = aviso «… está retirado: quítalo del ranking» y fuera de la vista pública (consulta y e2e); coronar al #2 lo saca del ranking numerado y guardarlo de nuevo falla (servicio); más puestos que `ranking_slots` se rechaza (servicio); una sugerencia descartada no vuelve (consulta y e2e). Además comprobé con pruebas de mutación que los tests de las reglas clave fallan si se rompe la regla (campeón en el ranking, género, guarda de `deleteFighter`, visibilidad). Nota de método: en la Task 2 escribí la implementación antes que los tests; los mutantes compensan, pero conviene que el revisor mire las pruebas de `service.test.ts` y `queries.test.ts`.

## Verificación

`pnpm test` 99 archivos / 827 pruebas, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` 131 pruebas y `E2E_DIST_DIR=.next-e2e pnpm build`: todo en verde. En corridas con muchos archivos con PGlite a veces un worker de Vitest se cae (`Worker exited unexpectedly … exit code 2147483651`): no es una prueba que falle; repetir la corrida.

## Pendientes

- **Tu base de desarrollo:** `pnpm db:migrate` (migración 0013) y `pnpm db:seed` (agrega campeones y rankings de ejemplo; no pisa lo existente). No toqué tu `pnpm dev`.
- **Plan 06 (home):** `getCachedPublicRankings(level)` devuelve `cards` con el P4P primero para «rankings resumidos»; `FighterCard` ya acepta `badge` y `backdrop`.
- **Un P4P por género** requeriría `gender` en el alcance (migración). Sin cambios hasta que se pida.
- Una corrección posterior que quite la victoria del retador **no** devuelve el título (solo se confirma, nunca se revierte solo): el admin lo corrige en Rankings y títulos.
- La ficha y la cartelera muestran el puesto guardado; la página de rankings compacta los puestos si alguien ya no se ve. Aparece un aviso en el panel para que se quite del ranking.
- Pendientes anteriores sin cambios: ver «Pendiente sin cambiar» del Plan 03.

## Comandos para probar

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm test && pnpm lint && pnpm typecheck
pnpm test:e2e
E2E_DIST_DIR=.next-e2e pnpm build
```

Si cambias código de una lectura cacheada y vuelves a correr los e2e, borra antes `.next-e2e/dev/cache`.

## Qué mirar (375 px y 1440 px)

Panel (`admin.localhost:3000`):
- **Rankings y títulos** (`/rankings`): pestañas Pro/Amateur, avisos rojos si hay retirados rankeados, tarjetas por alcance (P4P primero) con campeón, puestos y «N sugerencias»; sin scroll horizontal.
- **Editor de un ranking** (`/rankings/pro/peso-ligero`): campeón con «Cambiar campeón» / «Dejar vacante»; lista con arrastrar, subir, bajar y quitar (≥ 44 px); buscador «Agregar peleador»; barra «Guardar nueva versión» fija abajo en móvil.
- **Sugerencias:** cargar un resultado en una división con ranking y abrir su editor: «X (sin ranking) venció a Y (#3)», Aceptar / Descartar.
- **Cambio de título:** en la noche de pelea (375 px), que gane el retador de una pelea por el título abre el diálogo «Cambio de título».

Sitio (`localhost:3000`):
- **`/rankings`**: P4P primero y cada división; ▲▼/NUEVO; «Actualizado …»; cambiar a Amateur.
- **Ficha de un campeón** (p. ej. Matías Pérez): etiquetas «Campeón pro · Peso Ligero» y «#1 P4P» junto a la división; la portada sigue ocupando la pantalla.
- **Cartelera de GC 5**: «C» y «#1» sobre el nombre en la pelea por el título.

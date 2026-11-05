# OFL — Etiquetas de campeón y Dónde ver

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

## Cambios

- Franja de campeón/campeona pegada arriba de la foto en la cartelera y el detalle de pelea. Ancho completo de la foto, 24 px de alto en móvil y 28 px desde tablet, letras blancas y dorado oscuro con contraste legible.
- `BoutRankBadge` compartido para conservar el mismo formato y nombres por género. Se mantiene el espacio reservado de las esquinas sin campeón y el ranking numerado.
- Etiquetas de `FighterCard` abajo a la izquierda, con espacio para el nombre superpuesto. El componente cubre plantel y destacados de inicio; la ficha y rankings ya separaban sus etiquetas de la cara.
- «Dónde ver» usa la variante primaria roja, incluyendo hover y letras blancas, con o sin transmisión anunciada.
- Sin nuevas consultas, datos, dependencias o permisos. Ajuste del spec y decisión documentados.

## Verificación

- Regresión de «Dónde ver» primero falló con la variante anterior; luego implementada en rojo. E2e comprueba anchura, altura, borde contiguo, letras blancas y posición de etiquetas en plantel e inicio a 375/1440 px.
- `pnpm lint` y `pnpm typecheck`: en verde.
- `pnpm test --maxWorkers=2`: 149 archivos, 1.198 pruebas en verde.
- `pnpm test:e2e e2e/ofl-champion-presentation.spec.ts e2e/events-public.spec.ts e2e/fighters-public.spec.ts --workers=1`: 20 pruebas en verde. Incluye cartelera, detalle/tarjetas, plantel, destacados del inicio, medidas de las etiquetas y botón rojo a 375/1440 px; plantel sin overflow también a 320/768 px.
- Capturas de cartelera y tarjeta de peleador revisadas a 375/1440 px en `.superpowers/ofl-champion-preview/` (artefactos locales).

## Revisar

`/eventos/guerra-campal-5`, primera pelea y botón «Dónde ver»; `/peleadores`; destacados del inicio. También `/eventos/guerra-campal-1` → datos de la primera pelea → detalle y tarjetas.

## Corrección posterior del usuario

- Restaurado el degradado dorado original `#F4DE8C → #D4AF37 → #A8832C`, conservando la franja superior de ancho completo, altura y letras blancas. Sustituye el dorado oscuro descrito arriba.
- El nombre «Open Fight Latam» de la portada compartida aparece en blanco.
- Estilos calculados comprobados en el servidor local: marca `rgb(255, 255, 255)` y los tres colores originales del dorado.
- Lint y typecheck en verde; los dos e2e de presentación pasan a 375 y 1440 px.
- Suite completa tras la corrección: 149 archivos y 1.198 pruebas en verde (`pnpm test --maxWorkers=2`).

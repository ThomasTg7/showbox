# OFL — Acciones de portada en celular

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

- Entradas y transmisión comparten una fila de dos columnas en celular. La cartelera queda debajo y ocupa el ancho disponible.
- Por debajo de 400 px se usan «Entradas» y «Ver»; desde 400 px, los nombres completos. Nombres accesibles y destinos conservados.
- El ajuste está en `EventHero`, compartido por inicio y eventos, sin consultas ni dependencias nuevas.
- Capturas revisadas a 375 y 1440 px en `.superpowers/ofl-champion-preview/actions-*.png`. A 400 px los nombres completos caben en una fila.
- Regresión e2e reproducida antes del cambio: a 320 px los dos botones tenían 131 px de diferencia vertical.

- `pnpm lint` y `pnpm typecheck`: en verde.
- `pnpm test --maxWorkers=2`: 149 archivos y 1.198 pruebas en verde.
- `pnpm test:e2e e2e/ofl-hero-actions.spec.ts e2e/ofl-champion-presentation.spec.ts --workers=1`: 6 pruebas en verde, incluyendo inicio/eventos, botones juntos a 320/375/430/1440 px, objetivos táctiles y ausencia de overflow.

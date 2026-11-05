# OFL — Portadas y cartelera centradas

Fecha: 2026-10-11. Rama: `codex/ofl-redesign`.

## Cambios

- Home y evento comparten foto/careo a ancho completo, con etiquetas, nombres, fecha, lugar, contador y botones centrados. En PC los nombres van juntos; en móvil se apilan.
- «Dónde ver» enlaza a `streamUrl`; sin transmisión anunciada, lleva a un aviso dentro de la portada.
- Cartelera activa: negro con letras rojo OFL. Botón de detalle: degradado vertical rojo/violeta con letras blancas. Textos públicos antes violetas: degradado vertical. Línea del navbar: degradado horizontal.
- Navbar oculto mientras la portada está visible, con `inert`; reaparece fuera y se oculta al volver. La barra fija del evento queda debajo en PC.
- Logo transparente en el componente compartido, sin recortar el rayo. Se conserva el archivo original; el activo nuevo es WebP con alfa (20 KB).
- Sin cambios de consultas, datos, auditoría, permisos o dependencias. Decisión y actualización del spec registradas.

## Verificación

- `pnpm test --maxWorkers=2`: 149 archivos, 1.198 pruebas en verde. Se limitó el paralelismo para evitar saturar el entorno.
- Tests focalizados posteriores de portada y logo: 7 en verde.
- `pnpm lint` y `pnpm typecheck`: en verde.
- Eventos públicos y portadas: 9 e2e en verde. Dos timeouts de login admin en una corrida paralela desaparecieron al repetir secuencialmente (sin modificar autenticación).
- Home, layout, diseño OFL y portadas: 30 e2e en verde; menú, teclado, transiciones, detalle de pelea y tarjetas. La cartelera también pasó los 11 e2e de `event-page-changes.spec.ts` en la corrida anterior.
- Revisión final posterior de las tres pruebas de presentación: en verde, incluido degradado del botón, detalle y posición/ocultamiento de la barra fija.
- Capturas y ausencia de overflow a 375/1440 px; home además a 320/768 px. Portadas conservan los puntos focales independientes para móvil y PC.

## Mirar en el navegador

Home; `/eventos/guerra-campal-5`; `/eventos/guerra-campal-1` → abrir los datos de la primera pelea → «Ver la pelea y las tarjetas». Desplazarse fuera de la portada y volver para comprobar el navbar. Sin `streamUrl`, «Dónde ver» muestra el aviso de anuncio pendiente.

## Ajuste posterior: rojo más vivo

Inicio del degradado en `#E52244`; final violeta intacto. Token público compartido por textos, botón de pelea y líneas. Regresión de color primero en rojo y luego en verde. Verificación posterior: 1.198 pruebas unitarias, lint, typecheck y los tres e2e de presentación en verde (375/1440 px). El servidor local sigue activo en puerto 3002 (HTTP 200).

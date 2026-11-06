# Portadas despejadas, entradas de inicio y botonera

- El navbar se oculta mientras cualquier parte de la portada de inicio o evento siga arriba de la pantalla, también al regresar a ella. Fuera de la portada conserva el comportamiento direccional. Tab/Escape mantienen acceso deliberado con teclado.
- Inicio incorpora el banner inferior para el último evento próximo publicado con entradas asignadas: se ordena por fecha descendente y se exige ticketera o tramos. Se excluyen borradores, cancelados, finalizados y eventos viejos. Sin candidato, no se renderiza. Una consulta mínima de Postgres, cacheada por la etiqueta de eventos, evita cargar peleadores o medios.
- El banner de inicio y el del evento se mantienen ocultos sobre la portada; aparecen después de pasarla. Se conserva ocultación de entradas tras 3 segundos de reposo y margen inferior de 0 px.
- En la portada, «Dónde ver» con play ocupa el primer control junto a entradas; «Ver cartelera completa» ocupa la fila inferior móvil. En PC los tres siguen en una fila. Las tarjetas de vista previa conservan su distribución. Eventos finalizados conservan «Ver resultados».

## Verificación

- Suite general: 156 archivos, 1.221 pruebas correctas. Tras el último ajuste de botones, las 10 pruebas de acciones y portada pasaron, incluyendo el caso nuevo de orden de botones.
- Lint y TypeScript correctos en la versión final.
- 33 e2e de controles, layout y portadas pasaron; los 7 de controles se repitieron después de la aclaración de ocultar entradas sobre la portada, todos correctos. Los 14 casos de botonera/portada pasaron después del cambio de orden.
- Chrome: navbar oculto y entradas invisibles en portada de inicio y evento; banner de inicio vinculado a ShowBox Fight Night 5 en los datos locales. Distribución PC: tres controles del mismo ancho y altura; móvil: dónde ver/entradas y cartelera completa debajo.
- Capturas: `.local-runtime/outputs/showbox-home-portada-despejada.jpg` y `.local-runtime/outputs/showbox-portada-botonera-final.jpg`.

Al ampliar la revisión a `event-page-changes.spec.ts`, pasaron 8 de sus 11 casos. Tres expectativas históricas fallan fuera de estos cambios: rojo antiguo `rgb(197,27,58)` en vez del ShowBox actual `rgb(227,16,31)`, récords/países/pesos del seed anterior y mínimo de altura de foto de boxeador en pantalla baja (270 px frente a 279 esperados). No se modificaron esas funciones ni se relajaron sus pruebas. Evidencia en `.local-runtime/work/hero-buttons-e2e.log`.

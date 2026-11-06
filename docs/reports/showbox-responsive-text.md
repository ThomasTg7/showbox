# Nombres y divisiones completos

Se añadió `AutoFitText`, una hoja cliente reutilizable que conserva el texto del servidor y ajusta la letra al espacio real. Mide la palabra más ancha con la fuente variable, sus mayúsculas y espaciado; verifica además los rectángulos de los glifos reales. Cuando una palabra todavía se parte, busca el mayor tamaño que permite mostrarla completa. Mantiene un mínimo legible y permite líneas adicionales en nombres excepcionales en lugar de ocultar caracteres.

El tamaño preferido sigue procediendo del CSS responsive. Al cambiar el ancho o terminar de cargar fuentes se vuelve a calcular, por lo que el texto también puede crecer otra vez. Las mediciones se agrupan con `requestAnimationFrame` y se limpian observadores/listeners al desmontar. No hay mediciones continuas durante scroll, consultas nuevas, dependencias, cambios de datos ni nombres recortados en almacenamiento.

Aplicado a nombres de tarjetas de boxeadores, cartelera, ficha del combate, portada del boxeador/evento, rival e historial, títulos y nombres del ranking. Las columnas de ranking reservan más espacio al texto; `min-width: 0` evita que el contenido fuerce el ancho de su tarjeta. El resto de la jerarquía visual y destinos de enlaces se conserva.

## Verificación

- Regresión reproducida antes del cambio: «Supergallo» y «Superligero» se partían en `/rankings` a 375 px.
- Ocho e2e correctos: 320, 375, 768, 1024, 1440 y 1920 px en rankings, inicio, cartelera, listado y ficha de boxeador; también redimensionado sin recarga, nombre compuesto y cadena extrema de 70 caracteres. Se comprueba cada palabra dentro de su columna y ausencia de scroll horizontal; los nombres extremos conservan todos los caracteres mediante líneas adicionales.
- Pruebas dirigidas: 31 correctas (cálculo de tamaño, componentes de boxeador y portada).
- Revisión visual en Chrome: cartelera a 320 px, tarjetas a 768 px y rankings en móvil y escritorio. Capturas: `.local-runtime/outputs/showbox-ranking-texto-movil.jpg` y `.local-runtime/outputs/showbox-ranking-texto-pc.jpg`.
- Suite general: 157 archivos y 1.226 pruebas correctas. Lint y typecheck correctos.

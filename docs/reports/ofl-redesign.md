# OFL — rediseño público y del panel

Implementación del spec aprobado el 11 de octubre de 2026 en la copia independiente OFL, rama codex/ofl-redesign.

## Resultado

Identidad Open Fight Latam y logo aportado en sitio, panel, metadatos, icono, imagen social y correos. Paleta negro/blanco, rojo OFL y violeta; tipografías existentes. Portada con información junto a la fotografía en escritorio y foto primero en móvil; noticias editoriales claras; cifras y entradas oscuras. Intro breve que no tapa la información ni intercepta clics, transiciones de página, hover y movimiento reducido.

Panel oscuro con navegación agrupada, activo y foco violeta, botones rojos con texto blanco, títulos condensados, tarjetas y formularios grafito. Controles táctiles de 44 px y tema aplicado también a diálogos y menú móvil. Se conserva la arquitectura, autorización, validación, auditoría, caché y consultas. Sin dependencias nuevas.

Las pruebas del editor expusieron una carrera heredada de comunicación con la vista previa: ahora recupera el mensaje inicial perdido y las recargas del iframe. Test de regresión y revisión independiente; guardas de origen/ventana intactas.

## Conservación

GuerraCampal no fue modificado. Los 54 archivos de medios locales de OFL coinciden por SHA-256 con el original. La base de desarrollo conserva 13 peleadores, 5 eventos, 10 noticias y 31 registros de medios. Los nombres/slugs, resultados, fotos, textos y contactos guardados siguen siendo contenido de la copia; no se inventaron datos de OFL. El enlace oficial de Instagram de OFL aparece separado de las redes guardadas.

## Verificación

- Suite completa: 149 archivos y 1.196 pruebas en verde.
- Lint sin advertencias, tipos y compilación de producción en verde tras la corrección del editor.
- Matriz pública: 128 pruebas de navegador en verde (home, eventos, historial, noticias, entradas, SEO, accesibilidad, autenticación, dashboard y medios).
- Matriz adicional: 34 pruebas de edición de peleadores/noticias, rankings y noche de pelea pasaron en la primera ejecución. Tras corregir la vista previa y precisar dos selectores, la ejecución final de noticias, navegación, configuración, portales móviles, hover y animaciones pasó sus 36 pruebas, incluyendo todas las que habían fallado o quedado pendientes.
- Capturas y mediciones en 375 y 1440 px; público también en 320/768 px. Sin scroll horizontal en las pantallas verificadas; accesibilidad AA y movimiento reducido comprobados con navegador.
- Dos revisiones independientes aprobadas: rediseño general y corrección de la vista previa.
- Comprobación de la compilación de producción en 375 y 1440 px: inicio y acceso al panel, imágenes locales optimizadas y favicon disponibles; sin errores de JavaScript ni desbordamiento horizontal.

Los logs y capturas de esta sesión están en .superpowers/sdd/2026-10-11-ofl-redesign/ (excluidos de Git). No se hizo una medición de rendimiento de campo ni se desplegó públicamente.

## Ver el resultado

Sitio: http://localhost:3002/
Panel: http://admin.localhost:3002/

Desde OFL: docker compose up -d y pnpm dev --port 3002. No ejecutar db:seed sobre la base de desarrollo copiada.

Spec y plan: docs/superpowers/specs/2026-10-11-ofl-redesign-design.md y docs/superpowers/plans/2026-10-11-ofl-redesign.md. Desviaciones autorizadas y correcciones registradas en docs/decisions.md.

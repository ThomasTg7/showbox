# Open Fight Latam — rediseño del sitio público y panel

## Petición y referencia

El usuario pide una identidad nueva para Open Fight Latam (OFL), aplicada al sitio público completo y al panel de administración. Aporta su logo negro y blanco con un trazo diagonal rojo/violeta, el perfil https://www.instagram.com/openfightlatam/ y https://www.ufcespanol.com/ como referencia de profesionalismo deportivo. Solicita animaciones llamativas, transiciones fluidas y botones con hover.

Trabajar exclusivamente en `C:\Users\thoma\Documents\Proyectos\OFL`. Guerra Campal no se modifica. La arquitectura y las funcionalidades existentes se conservan.

**Estado:** aprobado por el usuario el 11 de octubre de 2026; implementación autorizada en la copia OFL.

## Dirección aprobada

Una presentación de promotora deportiva profesional: fotografía grande, pelea estelar protagonista, titulares condensados, información de evento clara y contraste entre superficies negras y blancas. El trazo diagonal del logo es el gesto propio de OFL: aparece en la portada, separadores puntuales y botones. El rojo identifica las acciones principales; el violeta identifica navegación, foco y acentos secundarios.

La referencia UFC orienta la jerarquía del contenido y la presentación de carteleras; no se usan logos, fotografías ni textos de UFC. El archivo de logo aportado por el usuario es el activo de marca autorizado.

## Decisiones propuestas por el diseñador

El usuario aprobó la propuesta completa:

- Panel oscuro, con navegación negra, superficie de trabajo grafito y texto claro.
- Tipografías existentes Anton para titulares, Barlow Condensed para navegación/datos deportivos y Barlow para lectura y formularios. Conservan legibilidad y evitan nuevas dependencias.
- Bordes rectos en el sitio deportivo; pequeñas esquinas de 4–8 px en campos y tarjetas de trabajo del panel, para diferenciarlo sin perder identidad.
- Mantener el contenido de la copia como material de vista previa. No cambiar nombres, slugs, fechas, resultados, contactos ni redes guardadas en la base. Las fotos o afiches que muestran la antigua promotora siguen siendo contenido heredado hasta que se proporcionen los de OFL.
- Mostrar el enlace oficial de Instagram aportado por el usuario en un lugar de marca independiente de las redes guardadas, sin inventar perfiles en otras redes.

## Colores

| Token | Valor | Uso |
|---|---|---|
| Negro | `#000000` | Marca, navegación y portadas |
| Blanco | `#FFFFFF` | Texto sobre oscuro y superficies editoriales |
| Grafito | `#151218` | Tarjetas, formularios y trabajo del panel |
| Rojo OFL | `#C51B3A` | Botón principal, barras y trazo del logo |
| Violeta OFL | `#643374` | Motivo diagonal y superficies/acento secundario |
| Violeta claro | `#C59BE5` | Enlaces, estados activos y foco sobre negro/grafito |

Grises neutros auxiliares para texto secundario y bordes. El logo conserva sus colores originales. Los tokens proceden de la imagen aportada; no se pretende reproducir un manual de marca inexistente.

Texto blanco sobre el rojo principal; negro sobre superficies blancas. No usar texto negro sobre rojo o violeta. Verificar AA en combinaciones nuevas. Los colores de las esquinas roja/azul de una pelea y los estados de éxito, advertencia o error conservan su significado deportivo/operativo.

Migrar los nombres de tokens amarillos a nombres semánticos de marca y acento en los componentes de la aplicación; evitar que el rediseño sea solo cambiar el valor de `--color-yellow`.

## Sitio público

### Navegación y marca

Logo OFL real con nombre accesible «Open Fight Latam». Encabezado negro sólido o con fondo que aparece por opacidad al desplazarse, navegación legible, indicador activo violeta y llamada roja a entradas. Menú móvil con las mismas secciones, objetivos de 44 px, cierre con Escape, foco atrapado y restaurado al salir. Pie de página nuevo con marca OFL y enlace a su Instagram.

### Portada y eventos

Una composición deportiva nueva, compartida por la home y las portadas de evento:

```text
PC
┌ OFL ── Eventos · Peleadores · Rankings · Noticias ── Entradas ┐
│ Información del evento     │ Fotografía / careo protagonista  │
│ PELEADOR                   │ Trazo diagonal OFL rojo/violeta  │
│ VS PELEADOR                │                                 │
│ Fecha, recinto, estado     │                                 │
│ Entradas · Ver cartelera   │                                 │
└ Banda breve: fecha · recinto · estatus de entradas ───────────┘

MÓVIL
┌ OFL ─────────────────────────────────────────────── Menú ┐
│ Fotografía / careo                                      │
│ Nombre del evento y estado                              │
│ PELEADOR VS PELEADOR                                    │
│ Fecha, recinto, cuenta regresiva y acciones              │
└────────────────────────────────────────────────────────┘
```

La foto subida y su variante móvil siguen teniendo prioridad sobre gráficos de respaldo. No cubrir rostros ni datos con decoración. La fecha y las acciones son visibles desde el primer render. Los estados de próximo evento, en vivo, pasado y sin eventos siguen funcionando. Sin datos, una portada OFL con el mensaje de próximo anuncio y acceso a peleadores.

### Home y páginas interiores

- Cartelera en superficie clara, filas de pelea bien delimitadas, retratos y resultados con alta jerarquía. Se conservan pestañas, comparación y enlaces de peleas.
- Noticias con composición editorial: imagen principal, encabezados sobrios y noticias secundarias. Fotos con hover por transform y capa de acento por opacidad.
- Peleadores en sección oscura, fotos recortadas y datos de récord claros. Se conserva el desplazamiento/pin existente, con la estética OFL.
- Cifras sobre una banda oscura con trazo de marca y contadores legibles; eliminar la banda amarilla y el gran fondo repetido de Guerra Campal.
- Rankings, entradas, formularios públicos, ficha de peleador, noticia, evento y páginas informativas reciben tokens, navegación, encabezados, controles y branding nuevos.
- Alternar negro/blanco para separar contenidos; no aplicar tintes rojos/violetas a todas las superficies ni llenar cada bloque de efectos.

## Panel de administración

- Login con logo OFL, fondo negro, trazo diagonal discreto y tarjeta grafito. Contraseña, recuperación y creación de cuenta conservan sus flujos.
- Sidebar negra con identidad OFL, secciones agrupadas visualmente, navegación activa violeta y acceso visible a cuenta/cierre de sesión.
- Barra superior con contexto del panel, navegación móvil y enlace para ver el sitio. No agregar controles que no tengan una función real.
- Página de inicio con bienvenida de marca, acciones frecuentes y próximo evento presentados con nueva jerarquía. Se reutilizan las lecturas existentes: no agregar consultas ni estadísticas decorativas.
- Tablas, tarjetas, formularios, diálogos, pestañas, editor, configuración, bandeja, historial y papelera heredan la paleta OFL y controles coherentes.
- Botón primario rojo con texto blanco; acciones secundarias neutras; foco violeta claro. Acciones destructivas permanecen claramente identificadas y separadas de las acciones habituales.
- Formularios y textos de tabla usan Barlow para lectura. No aplicar mayúsculas o tipografía gigante a toda la información del panel.
- A 375 px: navegación en panel lateral, listados en tarjetas, formularios en una columna y acciones táctiles de 44 px. Mantener mensajes, guardado fijo y confirmaciones existentes.

## Movimiento e interacción

- Un momento de marca en la portada: el trazo diagonal y el logo se presentan mediante transform/opacity, una vez por sesión. Duración total aproximada de 1 s, sin bloquear clics ni demorar lectura de contenido. Usar clave de sesión OFL y eliminar la presentación «GC».
- Menú móvil y diálogos: desplazamiento corto y opacidad, 180–300 ms; sin animar propiedades que recalculan layout.
- Hover de botones: barrido diagonal de una capa y movimiento mínimo del icono/texto, 180–260 ms. Estado presionado breve. Foco visible equivalente y estado deshabilitado intacto.
- Hover de fotografía: escala pequeña dentro de contenedor fijo, sin modificar dimensiones ni producir overflow.
- Revelación al entrar en pantalla y parallax existentes afinados para la marca. Reutilizar GSAP/Lenis donde ya existen y conservar sus cargas diferidas.
- Cambios de sección/pantalla: entrada breve por opacidad y transform al cambiar la ruta; no usar capturas de páginas ni introducir dependencias o APIs experimentales para transiciones.
- Panel: movimiento moderado, aplicado a respuesta del control, menús y cambio de pantalla; nada continuo en tablas, formularios o el dashboard.
- Respetar `prefers-reduced-motion`: eliminar intro/parallax/desplazamientos decorativos y conservar navegación, datos y foco. Sin JavaScript, el contenido sigue visible.

## Marca y contenido técnico

Centralizar «Open Fight Latam», «OFL», descripción y enlace oficial de Instagram en un módulo puro compartido. Aplicarlo a logos, textos de marca, metadatos, JSON-LD, encabezados del panel, mensajes de autenticación y plantillas de correo. Configuración local y contactos existentes no se sustituyen por información inventada.

Usar el logo aportado para encabezado, panel y recursos de marca, procesando variantes optimizadas y reservando dimensiones. Actualizar favicon y recurso social de respaldo para que no muestren GC. Las fotos de peleadores/eventos siguen usando MediaImage y variantes, con tamaños correctos y prioridad solo para LCP.

No modificar lógica de negocio, autenticación, validación Zod, auditoría, rutas públicas, slugs, base de datos ni almacenamiento. Cualquier escritura por una pantalla admin sigue llamando a requireAdmin() y registrando auditoría. No añadir nuevas escrituras para aplicar el diseño.

## Implementación y aceptación

Actualizar la documentación OFL y registrar la excepción a los tokens/maqueta de Guerra Campal en `docs/decisions.md`. El nuevo diseño OFL manda en esta copia sobre la estética heredada; las reglas funcionales, de seguridad y rendimiento permanecen vigentes.

TDD para los cambios funcionales de marca, navegación y movimiento reducido; pruebas de comportamiento, no solo comprobaciones de cadenas CSS. Actualizar las expectativas de marca de SEO/logo/email y accesibilidad; conservar las expectativas de nombres de eventos y otros datos de fixtures que no cambian.

Antes de finalizar:

- `pnpm test` (workers limitados si es necesario), `pnpm lint`, `pnpm typecheck` y e2e relevantes en verde.
- Comprobar home, evento, ficha, noticias, rankings, entradas, login y pantallas representativas del panel en 375 y 1440 px; smoke a 320 px en público.
- Confirmar ausencia de overflow, foco y uso por teclado, contraste AA y comportamiento con movimiento reducido. Contrastar capturas de antes/después.
- Verificar navegación, acceso y guardado del panel, carga de imágenes y escritorio/móvil sin alterar la base de datos de OFL de trabajo; pruebas en `ofl_e2e`.
- Revisar build/bundle si se agregan imports cliente o recursos. No añadir bibliotecas por decoración.
- Commit convencional en OFL y reporte de verificaciones/limitaciones. Guerra Campal intacto.

## Fuera del alcance

Publicar en internet, configurar dominios, extraer contenido de Instagram, crear afiches o imágenes oficiales de eventos, modificar resultados o reemplazar los registros heredados. Los activos OFL que no fueron entregados no se inventan.

## Estado

Propuesta de diseño preparada para revisión del usuario. La implementación de la aplicación se inicia después de aprobar esta descripción o de que el usuario indique que prefiere delegar esas decisiones y avanzar directamente.


## Ajuste solicitado el 11 de octubre de 2026

El inicio rojo de los degradados públicos usa `#E52244`, más vivo que el rojo base `#C51B3A`, por petición posterior del usuario. El final morado sigue en `#643374`.

Las etiquetas de campeón de cartelera y detalle de pelea son franjas de ancho completo pegadas arriba de la foto de su esquina, con altura constante y letras blancas sobre el degradado dorado original (#F4DE8C → #D4AF37 → #A8832C). En tarjetas del plantel e inicio, las etiquetas de foto van abajo a la izquierda sin tapar el nombre. «Dónde ver» usa el mismo rojo y comportamiento visual que «Comprar entradas».
La portada compartida usa foto/careo a ancho completo e información centrada: etiquetas, nombres, fecha, recinto, contador y botones. En PC los nombres pueden ir en una sola línea; en móvil se apilan. «Dónde ver» abre la transmisión configurada; sin ella, enlaza al aviso de anuncio pendiente. El navbar se oculta dentro de la portada y vuelve fuera de ella. Su línea superior pasa de rojo a violeta horizontalmente. Las pestañas de cartelera activas son negras con letras rojo OFL. Los textos violeta de eventos y detalles de pelea y la llamada «Ver la pelea y las tarjetas» usan un degradado vertical rojo a violeta. El logo compartido pierde el fondo negro y conserva las letras y el rayo completos.

El nombre «Open Fight Latam» de la portada compartida se muestra en blanco, por corrección posterior del usuario.

En celular, entradas y transmisión comparten una fila de dos columnas y la cartelera queda debajo. Por debajo de 400 px, las etiquetas visibles son «Entradas» y «Ver»; desde 400 px se conservan «Comprar entradas» y «Dónde ver». Los nombres accesibles completos se mantienen en todos los anchos.

Los datos de demostración usan eventos «OFL 1–5» y noticias referidas a OFL. Los enlaces canónicos de eventos y noticias llevan `ofl` en lugar del nombre anterior; las URLs antiguas redirigen permanentemente. Se mantienen las fotos, carteleras y relaciones del contenido existente.

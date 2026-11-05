# Open Fight Latam — Reglas del proyecto

Plataforma web para la promotora de MMA Open Fight Latam (OFL). Copia independiente de Guerra Campal. Sitio público estilo UFC + panel de administración propio.

- Spec de marca vigente: `docs/superpowers/specs/2026-10-11-ofl-redesign-design.md` (aprobado por el usuario).
- Spec funcional heredado: `docs/superpowers/specs/2026-09-28-guerra-campal-design.md`
- Planes: `docs/superpowers/plans/` (ejecutar en orden 00 → 07)
- Flujo de trabajo (ejecución + revisión): `docs/WORKFLOW.md`
- Registro de decisiones: `docs/decisions.md`
- Maqueta visual aprobada del home: `maqueta/index.html`

## Reglas no negociables

1. **El plan manda, pero no a ciegas.** Si una tarea del plan es incorrecta, imposible o hay una forma claramente mejor, se puede desviar **solo** si se registra en `docs/decisions.md` (qué, por qué, qué afecta a planes siguientes). Nunca desviarse en silencio.
2. **Tests primero** (TDD como indica cada tarea). Nada se da por terminado sin correr `pnpm test`, `pnpm lint`, `pnpm typecheck` y los e2e de la tarea, y ver que pasan.
3. **Portabilidad.** Solo Postgres estándar vía `DATABASE_URL`. Prohibido usar SDKs o features propietarias de Supabase/Neon/Vercel que impidan migrar a un VPS (excepto `@vercel/analytics`, detrás de `ANALYTICS_PROVIDER`).
4. **Seguridad del admin.** Toda server action y ruta del admin llama `requireAdmin()` en el servidor. Validar todo input con Zod. Registrar auditoría en toda escritura.
5. **Código en inglés, interfaz en español (es-CL).**

## Arquitectura

- Lógica de negocio pura en `src/domain/` (sin I/O, sin React, 100% testeada).
- Cada dominio en `src/features/<dominio>/` con `schema.ts` (Zod), `queries.ts` (lecturas), `actions.ts` (server actions), `components/`.
- Server Components por defecto. `"use client"` solo en hojas interactivas (formularios, animaciones, editores). Nunca marcar una página o layout completo como cliente.
- Un archivo = una responsabilidad. Si un archivo pasa de ~250 líneas o un componente de ~150, dividir.
- Reutilizar antes de crear: buscar en `src/components`, `src/features/*/components` y `src/domain` antes de escribir algo nuevo.

## Refactorización

- Regla de tres: la tercera vez que algo se repite, se extrae (componente, hook o función de dominio).
- Refactorizar dentro de la tarea que toca el código, no en tareas aparte; con los tests en verde antes y después.
- No dejar código muerto, `console.log`, TODOs sin registrar en `docs/decisions.md`, ni `any` sin justificación en comentario.
- Nombres que expliquen el propósito; sin abreviaturas inventadas.

## Rendimiento y escalabilidad

- **Consultas:** nunca N+1. Traer relaciones con joins o `inArray` en una sola consulta. Paginar todo listado (máx. 50 en admin, 12–24 en público). Índices en toda columna usada en `where`, `orderBy` o join (slugs, `status`, `publish_at`, `deleted_at`, FKs).
- **Caché:** páginas públicas cacheadas con tags (`fighter:<id>`, `event:<id>`, `post:<id>`, `rankings`, `settings`) e invalidadas en la action que escribe. Nada de `dynamic = 'force-dynamic'` en el sitio público sin justificarlo.
- **Imágenes:** siempre `MediaImage`/variantes WebP con `sizes` correctos; `priority` solo en la imagen LCP de cada página. Nunca servir originales.
- **JavaScript:** GSAP, Lenis, Tiptap, dnd-kit, react-easy-crop y el modelo de quitar fondo se cargan de forma diferida (`next/dynamic` o import dinámico) solo donde se usan. Revisar el tamaño del bundle al agregar dependencias.
- **Animaciones:** solo `transform` y `opacity`; nada que provoque layout en scroll. Todo respeta `prefers-reduced-motion`.
- **Presupuestos:** LCP < 2.5 s y CLS < 0.1 en móvil 4G para home, ficha y evento.
- Pensar cada consulta con 10× los datos del seed (500 peleadores, 100 eventos, 1.000 noticias).

## UI/UX — Panel admin (PC y móvil con la misma prioridad)

- Todo el panel debe usarse cómodamente en celular (375 px) **y** en PC (1440 px). Ninguna pantalla se diseña "para PC y después se adapta".
- Tablas: en móvil se transforman en tarjetas apiladas con las acciones principales visibles; nunca scroll horizontal de página.
- Formularios: una columna en móvil, dos en PC; etiquetas siempre visibles; errores en línea en español y junto al campo; botón principal fijo abajo en móvil.
- Objetivos táctiles ≥ 44×44 px. Arrastrar y soltar siempre con alternativa (botones subir/bajar) para móvil y teclado.
- Estados siempre visibles: cargando (skeleton), vacío (con acción sugerida), error (qué pasó y qué hacer), éxito (toast breve).
- Confirmación para acciones destructivas; deshacer cuando sea posible (papelera).
- Lenguaje claro para personas no técnicas: "Publicar", "Guardar borrador", "Enviar a papelera"; nada de jerga técnica.
- Menos clics: acciones frecuentes (cargar resultado, nuevo peleador, nueva noticia) a máximo 2 toques desde el inicio.

## UI/UX — Sitio público (vista del cliente)

- Seguir el spec aprobado de OFL: negro, blanco, rojo `#C51B3A`, violeta `#643374`, acento `#C59BE5`; Anton + Barlow Condensed + Barlow; mayúsculas, bordes rectos y fotografía protagonista. La maqueta de Guerra Campal queda como referencia histórica.
- Móvil primero, sin scroll horizontal en ningún ancho ≥ 320 px.
- Animaciones fluidas pero al servicio del contenido: la información (fecha, cartelera, récord, entradas) debe ser legible sin esperar ninguna animación.
- Accesibilidad: contraste AA, foco visible, textos alternativos, un solo `h1` por página, navegación por teclado. Texto sobre rojo OFL siempre blanco; texto sobre blanco siempre oscuro.
- Toda página con datos tiene estado vacío digno (p. ej. "Pronto anunciaremos el próximo evento").

## Verificación antes de cerrar una tarea

- [ ] Tests, lint, typecheck y e2e de la tarea en verde.
- [ ] Probado en 375 px y 1440 px (sin overflow horizontal).
- [ ] Sin consultas N+1 nuevas; índices para filtros nuevos.
- [ ] Cambios fuera del plan anotados en `docs/decisions.md`.
- [ ] Commit con mensaje convencional (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

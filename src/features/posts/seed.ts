import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { postCategories, postEvents, postFighters, posts } from "@/db/schema/posts";
import { bodyHasEmbed, type PostBody, type PostNode } from "@/domain/post-body";
import { slugify } from "@/domain/slug";

/** Categorías iniciales (spec §4.8); la promotora las edita desde el panel. */
export const POST_CATEGORIES = ["Anuncios", "Resultados", "Entrevistas", "Detrás de cámaras"] as const;

export async function seedPostCategories(db: Db): Promise<void> {
  await db
    .insert(postCategories)
    .values(POST_CATEGORIES.map((name, sortOrder) => ({ name, slug: slugify(name), sortOrder })))
    .onConflictDoNothing({ target: postCategories.slug });
}

const text = (value: string): PostNode => ({ type: "text", text: value });
const paragraph = (value: string): PostNode => ({ type: "paragraph", content: [text(value)] });
const heading = (value: string): PostNode => ({ type: "heading", attrs: { level: 2 }, content: [text(value)] });
const quote = (value: string): PostNode => ({ type: "blockquote", content: [paragraph(value)] });
const youtube = (id: string): PostNode => ({ type: "embed", attrs: { provider: "youtube", id } });
const doc = (...content: PostNode[]): PostBody => ({ type: "doc", content });

type SeedPost = {
  title: string;
  excerpt: string;
  category: (typeof POST_CATEGORIES)[number];
  daysAgo: number;
  featured?: boolean;
  body: PostBody;
  fighters?: string[];
  events?: string[];
};

const SEED_POSTS: SeedPost[] = [
  {
    title: "Cevallos defiende el cinturón ante Quiñónez",
    excerpt: "El campeón superligero enfrenta al retador #1 a 12 rounds en la pelea más esperada del año. Todo lo que tienes que saber antes de la velada.",
    category: "Anuncios",
    daysAgo: 1,
    featured: true,
    fighters: ["bryan-cevallos", "jordan-quinonez"],
    events: ["showbox-fight-night-5"],
    body: doc(
      paragraph("Bryan «El Martillo» Cevallos pone en juego el cinturón superligero ante Jordan «La Pantera» Quiñónez en la estelar de ShowBox Fight Night 5."),
      heading("Dos estilos opuestos"),
      paragraph("Cevallos llega con una racha de nocauts y una presión que ha quebrado a todos sus rivales. Quiñónez, zurdo y veloz, construyó su récord a punta de contragolpes y trabajo de piernas."),
      quote("«Cada pelea es una final», dijo el campeón al cierre del último entrenamiento abierto."),
      paragraph("Revisa la cartelera completa y los horarios en la página del evento."),
    ),
  },
  {
    title: "Así fue: Caicedo obliga al retiro de Huamán en el cuarto round",
    excerpt: "La esquina de Ruth Huamán no la dejó salir al quinto: Mishel Caicedo sigue invicta en la promotora.",
    category: "Resultados",
    daysAgo: 3,
    fighters: ["mishel-caicedo", "ruth-huaman"],
    events: ["showbox-fight-night-1"],
    body: doc(
      paragraph("La campeona mosca castigó al cuerpo desde el primer campanazo y mandó a la lona a su rival en el tercero."),
      youtube("dQw4w9WgXcQ"),
      paragraph("Huamán, que había empezado fuerte, no pudo recuperarse y su esquina detuvo la pelea (RTD)."),
    ),
  },
  {
    title: "Cartelera completa de ShowBox Fight Night 5 confirmada",
    excerpt: "Cinco peleas, dos títulos en juego y la defensa del cinturón superligero a 12 rounds en la estelar.",
    category: "Anuncios",
    daysAgo: 5,
    events: ["showbox-fight-night-5"],
    body: doc(paragraph("La promotora confirmó las peleas de la próxima velada."), heading("Las peleas"), paragraph("La cartelera estelar la encabeza la defensa de Cevallos.")),
  },
  {
    title: "Quiñónez: «Vengo a llevarme el cinturón a Esmeraldas»",
    excerpt: "El retador habló de su preparación y de lo que cambió desde su última derrota.",
    category: "Entrevistas",
    daysAgo: 7,
    fighters: ["jordan-quinonez"],
    body: doc(paragraph("Quiñónez hizo un campamento de ocho semanas en Esmeraldas con más de 100 rounds de sparring."), quote("«Estudié cada pelea de Cevallos. Hay un hueco y lo voy a encontrar.»")),
  },
  {
    title: "Mina sube al #3 del peso wélter",
    excerpt: "La victoria por decisión mayoritaria lo deja a un paso de la pelea por el título.",
    category: "Resultados",
    daysAgo: 10,
    fighters: ["luis-mina"],
    events: ["showbox-fight-night-3"],
    body: doc(paragraph("Con una actuación sólida, Mina se consolida entre los mejores de su división.")),
  },
  {
    title: "Un día en el campamento del campeón",
    excerpt: "Dos sesiones diarias, sparring y mucha disciplina: así prepara Cevallos su defensa en la altura de Quito.",
    category: "Detrás de cámaras",
    daysAgo: 12,
    fighters: ["bryan-cevallos"],
    body: doc(paragraph("Despierta a las 6:00 y entrena dos veces al día."), heading("La rutina"), paragraph("Carrera en la mañana, guantes y manoplas en la tarde y recuperación al final.")),
  },
  {
    title: "Caicedo: «Quiero defender el título cada año»",
    excerpt: "La campeona mosca habló de su camino y de su próximo objetivo.",
    category: "Entrevistas",
    daysAgo: 16,
    fighters: ["mishel-caicedo"],
    body: doc(paragraph("Mishel Caicedo no baja el ritmo."), quote("«Quiero que el cinturón se quede en casa.»")),
  },
  {
    title: "Resumen de ShowBox Fight Night 4",
    excerpt: "Una noche con dos nocauts, una descalificación y una candidata a pelea del año.",
    category: "Resultados",
    daysAgo: 20,
    featured: true,
    events: ["showbox-fight-night-4"],
    body: doc(paragraph("Repasa los resultados de la última velada, pelea por pelea.")),
  },
  {
    title: "Entradas para ShowBox Fight Night 5: tramos y puntos de venta",
    excerpt: "Cuánto cuestan, dónde comprarlas y qué incluye cada tramo.",
    category: "Anuncios",
    daysAgo: 24,
    events: ["showbox-fight-night-5"],
    body: doc(paragraph("Las entradas están a la venta en la ticketera oficial y en la boletería del recinto.")),
  },
  {
    title: "Detrás de cámaras: así fue el pesaje",
    excerpt: "Balanza, careos y un par de sorpresas.",
    category: "Detrás de cámaras",
    daysAgo: 30,
    events: ["showbox-fight-night-4"],
    body: doc(paragraph("Todos los boxeadores dieron el peso en la primera pasada, sin necesidad de la hora extra.")),
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** 10 noticias ficticias (incluye las de la maqueta), con boxeadores y eventos del seed. Idempotente (por slug). */
export async function seedPosts(db: Db, now: Date = new Date()): Promise<void> {
  await seedPostCategories(db);
  const categories = await db.select({ id: postCategories.id, slug: postCategories.slug }).from(postCategories);
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  const fighterSlugs = [...new Set(SEED_POSTS.flatMap((post) => post.fighters ?? []))];
  const eventSlugs = [...new Set(SEED_POSTS.flatMap((post) => post.events ?? []))];
  const [fighterRows, eventRows] = await Promise.all([
    fighterSlugs.length ? db.select({ id: fighters.id, slug: fighters.slug }).from(fighters).where(inArray(fighters.slug, fighterSlugs)) : [],
    eventSlugs.length ? db.select({ id: events.id, slug: events.slug }).from(events).where(inArray(events.slug, eventSlugs)) : [],
  ]);
  const fighterIdBySlug = new Map(fighterRows.map((row) => [row.slug, row.id]));
  const eventIdBySlug = new Map(eventRows.map((row) => [row.slug, row.id]));

  for (const post of SEED_POSTS) {
    const categoryId = categoryBySlug.get(slugify(post.category));
    if (!categoryId) throw new Error(`Falta la categoría ${post.category}`);
    const [created] = await db
      .insert(posts)
      .values({
        slug: slugify(post.title),
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        categoryId,
        featured: post.featured ?? false,
        hasMedia: bodyHasEmbed(post.body),
        status: "published",
        createdAt: new Date(now.getTime() - post.daysAgo * DAY_MS),
      })
      .onConflictDoNothing({ target: posts.slug })
      .returning({ id: posts.id });
    if (!created) continue;

    const fighterIds = (post.fighters ?? []).flatMap((slug) => fighterIdBySlug.get(slug) ?? []);
    const eventIds = (post.events ?? []).flatMap((slug) => eventIdBySlug.get(slug) ?? []);
    if (fighterIds.length) await db.insert(postFighters).values(fighterIds.map((fighterId) => ({ postId: created.id, fighterId })));
    if (eventIds.length) await db.insert(postEvents).values(eventIds.map((eventId) => ({ postId: created.id, eventId })));
  }
}

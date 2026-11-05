import { sql } from "drizzle-orm";
import { events } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import { posts } from "@/db/schema/posts";
import { sponsors } from "@/db/schema/sponsors";
import { revalidateEvent } from "@/features/events/cache";
import { revalidateFighter } from "@/features/fighters/cache";
import { revalidatePost } from "@/features/posts/cache";
import { revalidateSponsors } from "@/features/sponsors/cache";
import type { TrashableEntity } from "./trash";

// Registro único de entidades con papelera. Vive en un solo archivo (y no en
// cada feature) para que la página de Papelera y el cron de purga vean todas
// las entidades aunque no importen sus módulos. Cada plan agrega la suya.
export const TRASHABLE_ENTITIES: TrashableEntity[] = [
  { type: "fighter", label: "Boxeador", table: fighters, title: sql<string>`${fighters.firstName} || ' ' || ${fighters.lastName}`, revalidate: revalidateFighter },
  { type: "event", label: "Evento", table: events, title: events.name, revalidate: revalidateEvent },
  { type: "post", label: "Noticia", table: posts, title: posts.title, revalidate: revalidatePost },
  { type: "sponsor", label: "Patrocinador", table: sponsors, title: sponsors.name, revalidate: () => revalidateSponsors() },
];

import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { eventGallery, events } from "@/db/schema/events";
import { eventWatchPlatforms } from "@/db/schema/event-watch-platforms";
import { fighterGallery, fighters } from "@/db/schema/fighters";
import { postBodyMedia, postGallery, posts } from "@/db/schema/posts";
import { sponsors } from "@/db/schema/sponsors";

/**
 * Quién usa una imagen. Una imagen está en uso mientras alguna fila la referencia; el cron
 * (`purgeUnreferencedMedia`) borra las que nadie usa. La segunda forma es para referencias dentro de
 * JSON (p. ej. `settings.share.ogMediaId`), donde no hay columna ni FK: devuelve la condición "esta imagen se usa".
 */
export type MediaReference = { label: string; column: AnyPgColumn } | { label: string; isReferenced: (mediaId: SQL) => SQL };

/**
 * ÚNICO lugar que lista referencias a imágenes. Toda FK a `media.id` (con `on delete restrict` e índice)
 * debe registrarse aquí: `references.test.ts` recorre el esquema y falla si falta alguna.
 */
export const MEDIA_REFERENCES: MediaReference[] = [
  { label: "Foto de cuerpo del boxeador", column: fighters.bodyMediaId },
  { label: "Foto de rostro del boxeador", column: fighters.headshotMediaId },
  { label: "Galería del boxeador", column: fighterGallery.mediaId },
  { label: "Portada del evento", column: events.heroMediaId },
  { label: "Portada móvil del evento", column: events.heroMobileMediaId },
  { label: "Afiche del evento", column: events.posterMediaId },
  { label: "Galería del evento", column: eventGallery.mediaId },
  { label: "Imagen de plataforma de transmisión", column: eventWatchPlatforms.mediaId },
  { label: "Portada de la noticia", column: posts.coverMediaId },
  { label: "Galería de la noticia", column: postGallery.mediaId },
  { label: "Imagen dentro de la noticia", column: postBodyMedia.mediaId },
  { label: "Logo del patrocinador", column: sponsors.logoMediaId },
  // Dentro de JSON (sin FK): la imagen que se muestra al compartir el sitio (Configuración → Compartir).
  {
    label: "Imagen al compartir",
    isReferenced: (mediaId) => sql`exists (select 1 from site_settings where key = 'share' and value->>'ogMediaId' = ${mediaId}::text)`,
  },
];

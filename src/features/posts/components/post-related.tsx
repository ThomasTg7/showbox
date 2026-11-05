import Link from "next/link";
import { Flag } from "@/components/ui-gc/flag";
import { FighterFace } from "@/features/fighters/components/fighter-photo";
import { formatShortDate } from "@/lib/format-date";
import type { PostEventDTO, PostFighterDTO } from "../dto";

const LINK_CLASS =
  "group flex min-h-14 items-center gap-3 border border-border bg-surface p-2 pr-4 outline-none transition-opacity hover:border-brand focus-visible:border-brand";

/** Boxeadores y eventos de la noticia, con enlace a su ficha o página. No se dibuja nada si no hay relacionados públicos. */
export function PostRelated({ fighters, events }: { fighters: PostFighterDTO[]; events: PostEventDTO[] }) {
  if (fighters.length === 0 && events.length === 0) return null;

  return (
    <section aria-labelledby="post-related-title" data-slot="post-related" className="flex flex-col gap-6">
      <h2 id="post-related-title" className="font-display text-[clamp(26px,4vw,38px)] uppercase leading-none text-white">
        En esta noticia
      </h2>
      {fighters.length > 0 ? (
        <ul aria-label="Boxeadores" className="grid gap-3 sm:grid-cols-2">
          {fighters.map((fighter) => (
            <li key={fighter.id}>
              <Link href={`/boxeadores/${fighter.slug}`} className={LINK_CLASS}>
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden bg-surface-2 text-white">
                  <FighterFace fighter={fighter} sizes="48px" silhouetteClassName="h-full w-auto text-black drop-shadow-[0_0_1px_rgba(255,59,71,.6)]" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-cond text-lg font-bold uppercase leading-tight tracking-[.04em] text-white group-hover:text-accent-bright">
                    {fighter.firstName} {fighter.lastName}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Flag code={fighter.nationality} />
                    {fighter.nickname ? <span>«{fighter.nickname}»</span> : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {events.length > 0 ? (
        <ul aria-label="Eventos" className="grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/eventos/${event.slug}`} className={LINK_CLASS}>
                <span className="flex min-w-0 flex-col px-2">
                  <span className="font-cond text-lg font-bold uppercase leading-tight tracking-[.04em] text-white group-hover:text-accent-bright">{event.name}</span>
                  <span className="text-sm text-muted-foreground">{formatShortDate(new Date(event.startsAt))}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

import Link from "next/link";
import { Flag } from "@/components/ui-gc/flag";
import { championWord } from "@/domain/rankings";
import { FighterFigure } from "@/features/fighters/components/fighter-photo";
import { divisionTitle } from "@/features/fighters/labels";
import { formatDate } from "@/lib/format-date";
import type { RankingCardDTO } from "../dto";
import { MovementBadge } from "./movement-badge";

/** Título vacante: la caja de la foto muestra la silueta. */
const NO_PHOTOS = { headshotMedia: null, bodyMedia: null };

/**
 * Una tarjeta de ranking (estilo `.rank-card` de la maqueta): arriba, el campeón de la división (o el #1 del libra por
 * libra, que entonces no se repite en la lista) con su foto; abajo, los puestos con su movimiento contra la versión anterior.
 */
export function RankingCard({ division, champion, entries, updatedAt }: RankingCardDTO) {
  const isP4p = division === null;
  const title = isP4p ? "P4P" : divisionTitle(division);
  const leader = isP4p ? entries[0]?.fighter : champion;
  const leaderMovement = isP4p ? entries[0]?.movement : undefined;
  const listed = isP4p ? entries.slice(1) : entries;
  const championLabel = isP4p ? null : championWord(division.gender);
  const belt = championLabel ? `★ ${championLabel}` : "★ Libra por libra";
  const leaderName = leader?.name ?? "Vacante";

  return (
    <article aria-label={isP4p ? "Ranking libra por libra" : `Ranking ${title}`} className="flex flex-col border border-border bg-[#101010]">
      <div className="relative grid min-h-[150px] grid-cols-[1fr_120px] overflow-hidden border-b-[3px] border-brand bg-[linear-gradient(120deg,#1a1405,#0f0f0f_60%)]">
        <div className="relative z-10 p-[22px]">
          <p className="font-cond text-xs font-extrabold uppercase tracking-[.12em] text-accent-bright">{belt}</p>
          <h2 className="my-2 font-display text-[30px] uppercase leading-[1.05] text-white">{title}</h2>
          <p className="flex flex-wrap items-center gap-x-2.5 font-cond text-xl font-bold uppercase text-white">
            {leader ? (
              <Link href={`/boxeadores/${leader.slug}`} className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:decoration-brand focus-visible:decoration-[3px]">
                {leaderName}
              </Link>
            ) : (
              <span className="text-muted-foreground">{leaderName}</span>
            )}
            {leaderMovement ? <MovementBadge movement={leaderMovement} /> : null}
          </p>
          {champion?.since ? <p className="mt-1 font-cond text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground">{championLabel} desde {formatDate(new Date(`${champion.since}T12:00:00Z`))}</p> : null}
        </div>
        <div className="relative" aria-hidden>
          <FighterFigure
            fighter={leader ?? NO_PHOTOS}
            sizes="120px"
            imageClassName="absolute inset-y-0 right-0"
            silhouetteClassName="absolute -bottom-2.5 -right-2.5 h-[170px] text-black drop-shadow-[0_0_2px_rgba(255,59,71,.55)]"
          />
        </div>
      </div>

      {listed.length === 0 ? (
        isP4p ? null : <p className="px-[22px] py-5 font-cond text-sm font-semibold uppercase tracking-[.06em] text-muted-foreground">Aún sin ranking numerado.</p>
      ) : (
        <ol>
          {listed.map((entry) => (
            <li key={entry.fighter.id} className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5 border-b border-border px-[22px] py-3 font-cond text-[17px] font-bold uppercase tracking-[.03em] text-white">
              <span className="text-muted-foreground">
                {entry.position}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <Flag code={entry.fighter.nationality} className="shrink-0" />
                <Link href={`/boxeadores/${entry.fighter.slug}`} className="min-w-0 break-words underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:decoration-brand focus-visible:decoration-[3px]">
                  {entry.fighter.name}
                </Link>
              </span>
              <MovementBadge movement={entry.movement} />
            </li>
          ))}
        </ol>
      )}
      {updatedAt ? <p className="mt-auto px-[22px] py-3 font-cond text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground">Actualizado {formatDate(new Date(updatedAt))}</p> : null}
    </article>
  );
}

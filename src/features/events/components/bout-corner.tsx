import Link from "next/link";
import { MediaImage } from "@/components/media/media-image";
import { pickFighterPhoto } from "@/domain/fighter-photo";
import { FighterSilhouette } from "@/features/fighters/components/fighter-silhouette";
import type { BoutFighterDTO } from "../dto";
import { VictoryTag } from "./victory-tag";
import { BoutRankBadge } from "./bout-rank-badge";

export type Side = "red" | "blue";

/** Foto de la esquina: la de cuerpo si existe (recortada a medio cuerpo), si no la de rostro y si no la silueta. Si ganó, «Victoria» va sobre sus pies. */
function CornerPhoto({ fighter, side, won }: { fighter: BoutFighterDTO; side: Side; won: boolean }) {
  const { kind: photo, media } = pickFighterPhoto(fighter, "body");
  return (
    <div
      data-slot="bout-face"
      data-photo={photo}
      className={`relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-b from-neutral-100 to-neutral-200 lg:aspect-auto lg:h-[176px] lg:w-[148px] border-b-4 ${
        side === "red" ? "border-[#D7263D]" : "border-[#1E6FD9]"
      }`}
    >
      {media ? (
        <MediaImage media={media} sizes="(min-width: 640px) 190px, 30vw" anchorTop={photo === "body"} className="size-full object-cover" />
      ) : (
        <FighterSilhouette className="absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2 text-neutral-900" />
      )}
      {won ? <VictoryTag /> : null}
    </div>
  );
}

/** Columna de la foto: la placa de ranking arriba y la foto. */
export function CornerFigure({ fighter, side, won, rankLabel, gender }: { fighter: BoutFighterDTO; side: Side; won: boolean; rankLabel?: string; gender: "male" | "female" }) {
  return (
    <div className={`flex min-w-0 flex-col items-stretch ${side === "red" ? "[grid-area:rp]" : "[grid-area:bp]"}`}>
      <BoutRankBadge rankLabel={rankLabel} gender={gender} />
      <CornerPhoto fighter={fighter} side={side} won={won} />
    </div>
  );
}

/** El nombre de la esquina: al centro en celular (uno sobre otro con «vs»), junto a su foto en PC (nombre y apellido en dos líneas). */
export function CornerName({ fighter, side }: { fighter: BoutFighterDTO; side: Side }) {
  const name = (
    <>
      <span className="lg:block">{fighter.firstName}</span> <span className="lg:block">{fighter.lastName}</span>
    </>
  );
  return (
    <h3
      className={`min-w-0 break-words text-center font-display text-[clamp(16px,4.8vw,22px)] uppercase leading-[1.05] sm:text-[28px] text-black lg:text-[clamp(24px,2.4vw,36px)] lg:leading-[1.02] ${
        side === "red" ? "self-end [grid-area:rn] lg:text-left" : "self-start [grid-area:bn] lg:self-end lg:text-right"
      }`}
    >
      {fighter.isPublic ? (
        <Link href={`/boxeadores/${fighter.slug}`} className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:decoration-brand focus-visible:decoration-[3px]">
          {name}
        </Link>
      ) : (
        name
      )}
    </h3>
  );
}

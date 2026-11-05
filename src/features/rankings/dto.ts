import type { Movement } from "@/domain/rankings";
import type { BoutLevel } from "@/domain/bout-enums";
import type { ManualRecord } from "@/features/fighters/dto";
import type { MediaDTO } from "@/features/media/dto";

/** Un boxeador del editor del panel (el ranking guardado, también quien ya no se ve en el sitio). */
export type EditorFighter = {
  id: string;
  name: string;
  nationality: string;
  /** Por qué ya no se ve en el sitio (Retirado, Inactivo, En la papelera, No publicado); `null` si se ve. */
  hiddenNote: string | null;
};

export type RankedFighterDTO = {
  id: string;
  slug: string;
  name: string;
  nationality: string;
  /** Récord cargado a mano del nivel del ranking. */
  record: ManualRecord;
  /** Solo el campeón y el primero de un libra por libra traen fotos (las demás filas no las muestran): las dos, por si falta una. */
  bodyMedia: MediaDTO | null;
  headshotMedia: MediaDTO | null;
};

export type RankingEntryDTO = { position: number; fighter: RankedFighterDTO; movement: Movement };

export type RankingCardDTO = {
  level: BoutLevel;
  /** `null` = libra por libra. */
  division: { id: string; name: string; slug: string; gender: "male" | "female" } | null;
  champion: (RankedFighterDTO & { since: string | null }) | null;
  entries: RankingEntryDTO[];
  /** ISO de la versión vigente; `null` si la división tiene campeón pero aún ningún ranking. */
  updatedAt: string | null;
};

export type RankingsPageDTO = { level: BoutLevel; cards: RankingCardDTO[] };

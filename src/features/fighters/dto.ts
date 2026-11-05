import type { FighterSocials } from "@/db/schema/fighters";
import type { MediaDTO } from "@/features/media/dto";

export type ManualRecord = { wins: number; losses: number; draws: number; noContests: number };

export type FighterCardDTO = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  gender: "male" | "female";
  nationality: string;
  careerStatus: "active" | "inactive" | "retired";
  division: { name: string; slug: string; limitKg: number; gender: "male" | "female" };
  /** Récord profesional cargado a mano. */
  record: ManualRecord;
  /** Las dos fotos; cada pantalla elige con `pickFighterPhoto` (si falta la que prefiere, usa la otra). */
  bodyMedia: MediaDTO | null;
  headshotMedia: MediaDTO | null;
};

export type FighterProfileDTO = FighterCardDTO & {
  /** `YYYY-MM-DD`; la edad se calcula al mostrar. */
  birthDate: string | null;
  hometown: string | null;
  weightKg: number | null;
  heightCm: number | null;
  reachCm: number | null;
  stance: "orthodox" | "southpaw" | "switch" | null;
  gym: string | null;
  coach: string | null;
  baseDiscipline: string | null;
  bio: string | null;
  socials: FighterSocials;
  proRecord: ManualRecord;
  amateurRecord: ManualRecord;
  /** Galería de fotos, en orden. */
  gallery: MediaDTO[];
};

export type AdminFighterRow = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  nationality: string;
  careerStatus: "active" | "inactive" | "retired";
  status: "draft" | "scheduled" | "published";
  publishAt: Date | null;
  updatedAt: Date;
  divisionName: string;
  bodyMedia: MediaDTO | null;
  headshotMedia: MediaDTO | null;
};

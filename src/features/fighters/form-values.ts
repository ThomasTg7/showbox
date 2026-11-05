import type { Fighter } from "@/db/schema/fighters";

/** Los formularios HTML solo manejan texto: cada campo del boxeador como string (vacío = sin dato). */
export type FighterFormValues = Record<string, string>;

const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

export const EMPTY_FIGHTER_VALUES: FighterFormValues = {
  firstName: "",
  lastName: "",
  nickname: "",
  slug: "",
  gender: "male",
  birthDate: "",
  nationality: "EC",
  hometown: "",
  divisionId: "",
  weightKg: "",
  heightCm: "",
  reachCm: "",
  stance: "",
  gym: "",
  coach: "",
  baseDiscipline: "",
  bio: "",
  careerStatus: "active",
  instagram: "",
  tiktok: "",
  youtube: "",
  x: "",
  proWins: "0",
  proLosses: "0",
  proDraws: "0",
  proNoContests: "0",
  amWins: "0",
  amLosses: "0",
  amDraws: "0",
  amNoContests: "0",
};

export function fighterToFormValues(fighter: Fighter): FighterFormValues {
  return {
    firstName: fighter.firstName,
    lastName: fighter.lastName,
    nickname: text(fighter.nickname),
    slug: fighter.slug,
    gender: fighter.gender,
    birthDate: text(fighter.birthDate),
    nationality: fighter.nationality,
    hometown: text(fighter.hometown),
    divisionId: fighter.divisionId,
    weightKg: text(fighter.weightKg),
    heightCm: text(fighter.heightCm),
    reachCm: text(fighter.reachCm),
    stance: text(fighter.stance),
    gym: text(fighter.gym),
    coach: text(fighter.coach),
    baseDiscipline: text(fighter.baseDiscipline),
    bio: text(fighter.bio),
    careerStatus: fighter.careerStatus,
    instagram: text(fighter.socials.instagram),
    tiktok: text(fighter.socials.tiktok),
    youtube: text(fighter.socials.youtube),
    x: text(fighter.socials.x),
    proWins: text(fighter.proWins),
    proLosses: text(fighter.proLosses),
    proDraws: text(fighter.proDraws),
    proNoContests: text(fighter.proNoContests),
    amWins: text(fighter.amWins),
    amLosses: text(fighter.amLosses),
    amDraws: text(fighter.amDraws),
    amNoContests: text(fighter.amNoContests),
  };
}

/** Pestaña donde vive cada campo: si falla la validación, el formulario abre la primera pestaña con error. */
export const FIELD_TABS = {
  data: ["firstName", "lastName", "nickname", "slug", "gender", "birthDate", "nationality", "hometown", "divisionId", "careerStatus", "bio"],
  physical: ["weightKg", "heightCm", "reachCm", "stance", "gym", "coach", "baseDiscipline"],
  record: ["proWins", "proLosses", "proDraws", "proNoContests", "amWins", "amLosses", "amDraws", "amNoContests"],
  photos: ["bodyMediaId", "headshotMediaId", "galleryMediaIds"],
  socials: ["instagram", "tiktok", "youtube", "x"],
  publication: ["status", "publishAt"],
} as const;

export type FighterTab = keyof typeof FIELD_TABS;

export function tabForField(field: string): FighterTab | null {
  for (const [tab, fields] of Object.entries(FIELD_TABS)) {
    if ((fields as readonly string[]).includes(field)) return tab as FighterTab;
  }
  return null;
}

import type { FighterCardDTO } from "./dto";

export const CAREER_STATUS_LABELS = { active: "Activo", inactive: "Inactivo", retired: "Retirado" } as const;

export const STANCE_LABELS = { orthodox: "Ortodoxo", southpaw: "Zurdo", switch: "Switch" } as const;

/** "Peso Ligero" / "Peso Paja fem.": así se nombra una división en el sitio. */
export function divisionTitle(division: Pick<FighterCardDTO["division"], "name" | "gender">): string {
  return `Peso ${division.name}${division.gender === "female" ? " fem." : ""}`;
}

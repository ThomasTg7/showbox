import { slugify } from "@/domain/slug";

/** Mosca, Gallo y Pluma existen en ambos géneros: el slug de las femeninas lleva sufijo. */
export function divisionSlug(name: string, gender: "male" | "female"): string {
  return `peso-${slugify(name)}${gender === "female" ? "-femenino" : ""}`;
}

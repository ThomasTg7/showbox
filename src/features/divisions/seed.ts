import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { divisionSlug } from "./slug";

type SeedDivision = { name: string; gender: "male" | "female"; limitKg: number };

// Las 17 categorías del boxeo profesional (límites oficiales en kg; el Pesado no tiene tope y se guarda uno alto).
const MALE: [string, number][] = [
  ["Mínimo", 47.6],
  ["Minimosca", 49.0],
  ["Mosca", 50.8],
  ["Supermosca", 52.2],
  ["Gallo", 53.5],
  ["Supergallo", 55.3],
  ["Pluma", 57.2],
  ["Superpluma", 59.0],
  ["Ligero", 61.2],
  ["Superligero", 63.5],
  ["Wélter", 66.7],
  ["Superwélter", 69.9],
  ["Mediano", 72.6],
  ["Supermediano", 76.2],
  ["Semipesado", 79.4],
  ["Crucero", 90.7],
  ["Pesado", 150.0],
];

// Femenino: las categorías con actividad en la región (se activan o agregan más desde el panel).
const FEMALE: [string, number][] = [
  ["Minimosca", 49.0],
  ["Mosca", 50.8],
  ["Supermosca", 52.2],
  ["Gallo", 53.5],
  ["Pluma", 57.2],
  ["Ligero", 61.2],
  ["Superligero", 63.5],
  ["Wélter", 66.7],
];

const SEED_DIVISIONS: SeedDivision[] = [
  ...MALE.map(([name, limitKg]) => ({ name, gender: "male" as const, limitKg })),
  ...FEMALE.map(([name, limitKg]) => ({ name, gender: "female" as const, limitKg })),
];

export async function seedDivisions(db: Db): Promise<void> {
  const counters = { male: 0, female: 0 };
  await db
    .insert(divisions)
    .values(
      SEED_DIVISIONS.map((division) => ({
        ...division,
        slug: divisionSlug(division.name, division.gender),
        sortOrder: (counters[division.gender] += 1),
      })),
    )
    .onConflictDoNothing({ target: divisions.slug });
}

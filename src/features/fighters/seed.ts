import type { Db } from "@/db";
import { divisions } from "@/db/schema/divisions";
import { fighters } from "@/db/schema/fighters";
import { normalizeSearchText } from "@/domain/search";
import { slugify } from "@/domain/slug";
import { seedDivisions } from "@/features/divisions/seed";

type SeedFighter = {
  firstName: string;
  lastName: string;
  nickname: string;
  nationality: string;
  divisionSlug: string;
  record: [wins: number, losses: number, draws: number];
  careerStatus?: "active" | "retired";
  hometown: string;
  gym: string;
  heightCm: number;
  /** Alcance (cm): lo traen solo algunos, para que la comparación de la cartelera omita el dato cuando falta. */
  reachCm?: number;
  stance: "orthodox" | "southpaw";
  bio: string;
  birthDate: string;
};

const SEED_FIGHTERS: SeedFighter[] = [
  { firstName: "Bryan", lastName: "Cevallos", nickname: "El Martillo", nationality: "EC", divisionSlug: "peso-superligero", record: [14, 1, 0], hometown: "Quito", gym: "Box Club Pichincha", heightCm: 175, reachCm: 180, stance: "orthodox", bio: "Campeón superligero. Presión constante y una derecha que apaga las luces.", birthDate: "1995-03-12" },
  { firstName: "Jordan", lastName: "Quiñónez", nickname: "La Pantera", nationality: "EC", divisionSlug: "peso-superligero", record: [12, 1, 1], hometown: "Esmeraldas", gym: "Esmeraldas Boxing", heightCm: 177, reachCm: 183, stance: "southpaw", bio: "Zurdo veloz, especialista en contragolpes y trabajo de piernas.", birthDate: "1997-07-21" },
  { firstName: "Kevin", lastName: "Andrango", nickname: "El Cóndor", nationality: "EC", divisionSlug: "peso-superligero", record: [9, 3, 0], hometown: "Otavalo", gym: "Imbabura Box", heightCm: 172, stance: "orthodox", bio: "Ritmo alto y cardio de altura: nunca deja de lanzar golpes.", birthDate: "1998-11-02" },
  { firstName: "Luis", lastName: "Mina", nickname: "Dinamita", nationality: "EC", divisionSlug: "peso-welter", record: [11, 2, 0], hometown: "Guayaquil", gym: "Puerto Boxing Club", heightCm: 178, stance: "orthodox", bio: "Golpeador de mano pesada: 8 de sus victorias fueron por nocaut.", birthDate: "1994-05-30" },
  { firstName: "Carlos", lastName: "Valencia", nickname: "Tornado", nationality: "CO", divisionSlug: "peso-welter", record: [10, 2, 0], hometown: "Cali", gym: "Valle Boxing", heightCm: 176, stance: "southpaw", bio: "Combinaciones al cuerpo y mucho volumen en las distancias cortas.", birthDate: "1995-09-14" },
  { firstName: "Andrés", lastName: "Tapia", nickname: "El Muro", nationality: "EC", divisionSlug: "peso-welter", record: [7, 4, 1], hometown: "Ambato", gym: "Tungurahua Box", heightCm: 180, stance: "orthodox", bio: "Guardia cerrada, mentón de acero y oficio para llegar a las tarjetas.", birthDate: "1997-01-08" },
  { firstName: "Mishel", lastName: "Caicedo", nickname: "La Reina", nationality: "EC", divisionSlug: "peso-mosca-femenino", record: [8, 0, 0], hometown: "Guayaquil", gym: "Puerto Boxing Club", heightCm: 158, stance: "orthodox", bio: "Campeona mosca e invicta. Jab preciso y gran lectura del ring.", birthDate: "2000-02-29" },
  { firstName: "Daniela", lastName: "Pazmiño", nickname: "Tormenta", nationality: "EC", divisionSlug: "peso-mosca-femenino", record: [6, 2, 1], hometown: "Cuenca", gym: "Azuay Fight Club", heightCm: 156, stance: "southpaw", bio: "Zurda agresiva que corta el ring y castiga al cuerpo.", birthDate: "2000-04-18" },
  { firstName: "Ruth", lastName: "Huamán", nickname: "La Bala", nationality: "PE", divisionSlug: "peso-mosca-femenino", record: [5, 3, 0], hometown: "Lima", gym: "Callao Box", heightCm: 155, stance: "orthodox", bio: "Explosiva en los primeros rounds.", birthDate: "2001-10-05" },
  { firstName: "Jefferson", lastName: "Chalá", nickname: "Halcón", nationality: "EC", divisionSlug: "peso-supergallo", record: [13, 2, 0], hometown: "Ibarra", gym: "Imbabura Box", heightCm: 168, stance: "orthodox", bio: "Técnico y paciente: gana los rounds con el jab y el gancho al hígado.", birthDate: "1993-12-25" },
  { firstName: "Martín", lastName: "Olivera", nickname: "Ciclón", nationality: "VE", divisionSlug: "peso-supergallo", record: [10, 4, 0], hometown: "Caracas", gym: "Caracas Boxing", heightCm: 166, stance: "southpaw", bio: "Movimiento constante y golpes en combinación.", birthDate: "1994-08-09" },
  { firstName: "Patricio", lastName: "Ortiz", nickname: "El Profe", nationality: "EC", divisionSlug: "peso-supergallo", record: [18, 7, 2], careerStatus: "retired", hometown: "Loja", gym: "Loja Box", heightCm: 167, stance: "orthodox", bio: "Veterano retirado; hoy entrena a las nuevas generaciones del boxeo ecuatoriano.", birthDate: "1988-06-16" },
];

/** 12 boxeadores ficticios publicados, repartidos en Superligero, Wélter, Mosca femenino y Supergallo. Idempotente. */
export async function seedFighters(db: Db): Promise<void> {
  await seedDivisions(db);
  const divisionRows = await db.select({ id: divisions.id, slug: divisions.slug, gender: divisions.gender, limitKg: divisions.limitKg }).from(divisions);
  const divisionBySlug = new Map(divisionRows.map((division) => [division.slug, division]));

  await db
    .insert(fighters)
    .values(
      SEED_FIGHTERS.map((fighter) => {
        const division = divisionBySlug.get(fighter.divisionSlug);
        if (!division) throw new Error(`Falta la división ${fighter.divisionSlug}`);
        const [wins, losses, draws] = fighter.record;
        return {
          slug: slugify(`${fighter.firstName} ${fighter.lastName}`),
          firstName: fighter.firstName,
          lastName: fighter.lastName,
          nickname: fighter.nickname,
          gender: division.gender,
          nationality: fighter.nationality,
          divisionId: division.id,
          birthDate: fighter.birthDate,
          weightKg: division.limitKg,
          hometown: fighter.hometown,
          gym: fighter.gym,
          heightCm: fighter.heightCm,
          reachCm: fighter.reachCm ?? null,
          stance: fighter.stance,
          bio: fighter.bio,
          careerStatus: fighter.careerStatus ?? "active",
          proWins: wins,
          proLosses: losses,
          proDraws: draws,
          searchText: normalizeSearchText(`${fighter.firstName} ${fighter.lastName} ${fighter.nickname}`),
          status: "published" as const,
        };
      }),
    )
    .onConflictDoNothing({ target: fighters.slug });
}

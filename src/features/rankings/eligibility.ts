import { and, eq, or, sql, type SQL } from "drizzle-orm";
import { publicScope } from "@/db/public-scope";
import { bouts } from "@/db/schema/events";
import { fighters } from "@/db/schema/fighters";
import type { BoutLevel } from "@/domain/bout-enums";

/** Boxeadores que el sitio muestra en un ranking: activos y públicos ahora (publicados, no en la papelera). */
export const visibleRankedFighter: SQL = and(publicScope(fighters), eq(fighters.careerStatus, "active")) as SQL;

/** El boxeador tiene récord manual en el nivel (V+D+E+NC > 0). */
function hasManualRecord(level: BoutLevel): SQL {
  return level === "pro"
    ? sql`(${fighters.proWins} + ${fighters.proLosses} + ${fighters.proDraws} + ${fighters.proNoContests}) > 0`
    : sql`(${fighters.amWins} + ${fighters.amLosses} + ${fighters.amDraws} + ${fighters.amNoContests}) > 0`;
}

/** El boxeador tiene al menos una pelea terminada del nivel (una sola subconsulta, sin una consulta por boxeador). */
function hasCompletedBout(level: BoutLevel): SQL {
  return sql`exists (select 1 from ${bouts} where ${bouts.level} = ${level} and ${bouts.boutStatus} = 'completed' and (${bouts.redFighterId} = ${fighters.id} or ${bouts.blueFighterId} = ${fighters.id}))`;
}

/**
 * Quién puede entrar a un ranking o ser campeón: activo, público, del mismo género de la división (`gender` nulo = libra
 * por libra, sin filtro) y con peleas del nivel (o récord manual en ese nivel).
 */
export function eligibleFighter(level: BoutLevel, gender: "male" | "female" | null): SQL {
  return and(
    visibleRankedFighter,
    gender ? eq(fighters.gender, gender) : undefined,
    or(hasCompletedBout(level), hasManualRecord(level)),
  ) as SQL;
}

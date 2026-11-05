import { z } from "zod";
import { BOUT_LEVELS } from "@/domain/bout-enums";

export const rankingScopeSchema = z.object({ level: z.enum(BOUT_LEVELS), divisionId: z.uuid().nullable() });

/** Tope defensivo: ninguna división ni el libra por libra tiene más de unas decenas de puestos. */
export const rankingIdsSchema = z.array(z.uuid()).max(50);

/** `baseVersionId`: la versión sobre la que se armó el borrador (`null` si no había); si otra persona guardó entretanto, se rechaza. */
export const saveRankingSchema = z.object({ scope: rankingScopeSchema, fighterIds: rankingIdsSchema, baseVersionId: z.uuid().nullable() });

export const championSchema = z.object({ level: z.enum(BOUT_LEVELS), divisionId: z.uuid(), fighterId: z.uuid() });

export const vacateSchema = z.object({ level: z.enum(BOUT_LEVELS), divisionId: z.uuid() });

/** `pro:<división>` o `amateur:p4p`: el alcance del que se descarta una sugerencia. */
export const scopeKeySchema = z.string().regex(/^(pro|amateur):(p4p|[0-9a-f-]{36})$/);

export const dismissSchema = z.object({ eventId: z.uuid(), fighterId: z.uuid(), scopeKey: scopeKeySchema });

export const visibilitySchema = z.object({ level: z.enum(BOUT_LEVELS), isPublic: z.boolean() });

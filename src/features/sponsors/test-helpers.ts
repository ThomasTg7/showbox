import type { Db } from "@/db";
import { sponsorEvents, sponsors } from "@/db/schema/sponsors";
import { insertMedia } from "@/features/fighters/test-helpers";
import type { SponsorFormInput } from "./schema";

let sponsorCounter = 0;

/** Patrocinador oficial vigente de todos los eventos, con su logo; `overrides` pisa cualquier columna. `eventIds` lo limita a esos eventos. */
export async function insertSponsor(
  db: Db,
  overrides: Partial<typeof sponsors.$inferInsert> & { eventIds?: string[] } = {},
): Promise<{ id: string; name: string }> {
  sponsorCounter += 1;
  const { eventIds = [], ...columns } = overrides;
  const [row] = await db
    .insert(sponsors)
    .values({
      name: `Patrocinador ${sponsorCounter}`,
      logoMediaId: await insertMedia(db, "sponsor_logo", { mime: "image/svg+xml", width: 600, height: 300 }),
      tier: "oficial",
      sortOrder: sponsorCounter,
      allEvents: eventIds.length === 0,
      ...columns,
    })
    .returning({ id: sponsors.id, name: sponsors.name });
  if (eventIds.length > 0) await db.insert(sponsorEvents).values(eventIds.map((eventId) => ({ sponsorId: row!.id, eventId })));
  return row!;
}

/** Formulario válido mínimo para los tests del servicio. */
export function validSponsorInput(logoMediaId: string, overrides: Partial<SponsorFormInput> = {}): SponsorFormInput {
  return { name: "Gimnasio Titán", logoMediaId, tier: "oficial", ...overrides };
}

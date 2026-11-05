import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { createTestDb } from "@/test/db";
import { listDivisions } from "./queries";
import { seedDivisions } from "./seed";
import { reorderDivisions, saveDivision, toggleDivision } from "./service";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

describe("seedDivisions", () => {
  it("creates the 17 boxing weight classes plus 8 women's divisions and is idempotent", async () => {
    await seedDivisions(db);
    await seedDivisions(db);
    const all = await listDivisions(db);
    expect(all).toHaveLength(25);
    expect(all.filter((division) => division.gender === "male")).toHaveLength(17);
    expect(all.every((division) => division.rankingSlots === 5)).toBe(true);
  });

  it("orders male divisions before female and by sort order", async () => {
    const all = await listDivisions(db);
    expect(all.slice(0, 3).map((division) => division.name)).toEqual(["Mínimo", "Minimosca", "Mosca"]);
    expect(all[17]).toMatchObject({ name: "Minimosca", gender: "female", limitKg: 49, slug: "peso-minimosca-femenino" });
    expect(all.find((division) => division.slug === "peso-superligero")?.limitKg).toBe(63.5);
    expect(all.find((division) => division.slug === "peso-welter")?.limitKg).toBe(66.7);
  });
});

describe("saveDivision", () => {
  it("rejects a weight limit of zero with a Spanish message", async () => {
    await expect(saveDivision(db, { name: "Test", gender: "male", limitKg: 0, rankingSlots: 5 }, "admin-1")).rejects.toThrow(
      "El límite de peso debe ser mayor que 0",
    );
  });

  it("creates a division at the end of its gender with a unique slug and audits it", async () => {
    const created = await saveDivision(db, { name: "Súper Pesado", gender: "male", limitKg: 130, rankingSlots: 5 }, "admin-1");
    expect(created.slug).toBe("peso-super-pesado");
    expect(created.sortOrder).toBeGreaterThan(8);

    const again = await saveDivision(db, { name: "Súper Pesado", gender: "male", limitKg: 131, rankingSlots: 5 }, "admin-1");
    expect(again.slug).toBe("peso-super-pesado-2");

    const rows = await db.select().from(auditLog).where(eq(auditLog.entityId, created.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorId).toBe("admin-1");
  });

  it("keeps the slug when a division is renamed", async () => {
    const [ligero] = (await listDivisions(db)).filter((division) => division.slug === "peso-superligero");
    const updated = await saveDivision(
      db,
      { id: ligero?.id, name: "Ligero Nuevo", gender: "male", limitKg: 70.3, rankingSlots: 8 },
      "admin-1",
    );
    expect(updated.slug).toBe("peso-superligero");
    expect(updated.name).toBe("Ligero Nuevo");
    expect(updated.rankingSlots).toBe(8);
  });
});

describe("toggleDivision", () => {
  it("deactivates and reactivates a division, hiding it from activeOnly", async () => {
    const [mosca] = await listDivisions(db);
    await toggleDivision(db, mosca!.id, false, "admin-1");
    expect((await listDivisions(db, { activeOnly: true })).some((division) => division.id === mosca!.id)).toBe(false);
    await toggleDivision(db, mosca!.id, true, "admin-1");
    expect((await listDivisions(db, { activeOnly: true })).some((division) => division.id === mosca!.id)).toBe(true);
  });
});

describe("reorderDivisions", () => {
  it("applies the given order within a gender", async () => {
    const women = (await listDivisions(db)).filter((division) => division.gender === "female");
    const reversed = [...women].reverse().map((division) => division.id);
    await reorderDivisions(db, "female", reversed, "admin-1");
    const after = (await listDivisions(db)).filter((division) => division.gender === "female");
    expect(after.map((division) => division.id)).toEqual(reversed);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { formRateLimits } from "@/db/schema/inbox";
import { createTestDb } from "@/test/db";
import { checkRateLimit, hashIp, MAX_SUBMISSIONS_PER_HOUR } from "./rate-limit";

const NOW = new Date("2026-10-10T15:00:00Z");
const minutesLater = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe("rate limit", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("allows 5 submissions an hour from the same address and refuses the 6th", async () => {
    const results: boolean[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) results.push(await checkRateLimit(db, "ip-a", minutesLater(attempt)));

    expect(MAX_SUBMISSIONS_PER_HOUR).toBe(5);
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("counts each address on its own", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) await checkRateLimit(db, "ip-a", NOW);

    expect(await checkRateLimit(db, "ip-a", NOW)).toBe(false);
    expect(await checkRateLimit(db, "ip-b", NOW)).toBe(true);
  });

  it("starts a fresh hour after the first submission of the window is an hour old", async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) await checkRateLimit(db, "ip-a", NOW);

    expect(await checkRateLimit(db, "ip-a", minutesLater(59))).toBe(false);
    expect(await checkRateLimit(db, "ip-a", minutesLater(61))).toBe(true);
  });

  it("forgets addresses whose window already ended, so the table does not grow forever", async () => {
    await checkRateLimit(db, "old-ip", NOW);

    await checkRateLimit(db, "new-ip", minutesLater(180));

    expect((await db.select().from(formRateLimits)).map((row) => row.ipHash)).toEqual(["new-ip"]);
  });

  describe("hashIp", () => {
    it("is a stable SHA-256 per salt and never contains the address", () => {
      const hash = hashIp("190.20.30.40", "sal-1");

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).toBe(hashIp("190.20.30.40", "sal-1"));
      expect(hash).not.toBe(hashIp("190.20.30.40", "sal-2"));
      expect(hash).not.toBe(hashIp("190.20.30.41", "sal-1"));
    });
  });
});

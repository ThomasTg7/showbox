import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import type { StorageDriver } from "@/lib/storage";
import { createTestDb } from "@/test/db";
import { listSponsorsFor } from "./queries";
import { seedSponsors } from "./seed";

function memoryStorage(): StorageDriver & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    put: async (key, body) => void files.set(key, body),
    get: async (key) => files.get(key) ?? Promise.reject(new Error("no existe")),
    delete: async (key) => void files.delete(key),
    publicUrl: (key) => `/media/${key}`,
    presignPut: async () => ({ url: "", headers: {} }),
  };
}

describe("seedSponsors", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let db: Db;

  beforeEach(async () => {
    testDb = await createTestDb();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("creates one sponsor per tier with an SVG logo stored in the storage", async () => {
    const storage = memoryStorage();
    await seedSponsors(db, storage);

    const onEvent = await listSponsorsFor(db, "event");
    expect(onEvent.map((sponsor) => sponsor.tier)).toEqual(["principal", "oficial", "oficial", "colaborador"]);
    expect(storage.files.size).toBe(4);
    for (const sponsor of onEvent) {
      expect(sponsor.logo.kind).toBe("sponsor_logo");
      expect(storage.files.get(sponsor.logo.originalUrl.replace("/media/", ""))?.toString()).toContain("<svg");
    }
  });

  it("does nothing when there are already sponsors, so it never overrides what the promoter loaded", async () => {
    const storage = memoryStorage();
    await seedSponsors(db, storage);
    await seedSponsors(db, storage);

    expect(await listSponsorsFor(db, "event")).toHaveLength(4);
    expect(storage.files.size).toBe(4);
  });
});

import { afterAll, beforeAll, expect, it } from "vitest";
import type { Db } from "@/db";
import { createTestDb } from "@/test/db";
import { createEvent, duplicateEvent, updateEvent } from "./service";
import { getPublicEventBySlug, listPublicEvents } from "./queries";
import { validEventInput } from "./test-helpers";
import { eq } from "drizzle-orm";
import { auditLog } from "@/db/schema/audit";
import { media } from "@/db/schema/media";
import { insertMedia } from "@/features/fighters/test-helpers";
import { getEventForEdit } from "./admin-queries";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await createTestDb()); });
afterAll(() => close());

it("stores multiple platforms per event and exposes them in cards and the event page", async () => {
  const watchPlatforms = [{ name: "YouTube", url: "https://youtube.com/live/ofl", mediaId: null }, { name: "Twitch", url: "https://twitch.tv/ofl", mediaId: null }];
  const input = { ...validEventInput({ status: "published", startsDate: "2031-05-17" }), watchPlatforms };
  const event = await createEvent(db, input, "admin-1");
  expect((await getPublicEventBySlug(db, event.slug))?.watchPlatforms).toEqual(watchPlatforms.map(({ name, url }) => ({ name, url, media: null })));
  const cards = await listPublicEvents(db, { when: "upcoming" });
  expect(cards.items.find((card) => card.id === event.id)?.watchPlatforms).toHaveLength(2);
  const other = await createEvent(db, { ...input, name: "Otro evento", watchPlatforms: [] }, "admin-1");
  expect((await getPublicEventBySlug(db, other.slug))?.watchPlatforms).toEqual([]);
  const copy = await duplicateEvent(db, event.id, "admin-1");
  expect((await getPublicEventBySlug(db, copy.slug, { preview: true }))?.watchPlatforms).toHaveLength(2);
  await updateEvent(db, event.id, { ...input, watchPlatforms: [] }, "admin-1");
  expect((await getPublicEventBySlug(db, event.slug))?.watchPlatforms).toEqual([]);
});

it("validates platform images, protects them from deletion and audits event writes", async () => {
  const imageId = await insertMedia(db, "sponsor_logo");
  const watchPlatforms = [{ name: "Plataforma", url: "https://example.com", mediaId: imageId }];
  const input = { ...validEventInput({ name: "Con plataforma ilustrada", status: "published" }), watchPlatforms };
  const event = await createEvent(db, input, "admin-1");
  expect((await getEventForEdit(db, event.id))?.watchPlatforms[0]?.media?.id).toBe(imageId);
  expect((await getPublicEventBySlug(db, event.slug))?.watchPlatforms?.[0]?.media?.id).toBe(imageId);
  await expect(db.delete(media).where(eq(media.id, imageId))).rejects.toThrow();
  await updateEvent(db, event.id, { ...input, watchPlatforms: [] }, "admin-1");
  const audit = await db.select().from(auditLog).where(eq(auditLog.entityId, event.id));
  expect(audit.map((row) => row.action)).toEqual(["create", "update"]);
  const wrongKind = await insertMedia(db, "gallery");
  for (const mediaId of [wrongKind, "00000000-0000-4000-8000-000000000000"]) {
    await expect(createEvent(db, { ...input, watchPlatforms: [{ ...watchPlatforms[0]!, mediaId }] }, "admin-1")).rejects.toThrow("La imagen ya no está disponible");
  }
});

it("keeps older stream links available and reads serialized platform inputs", async () => {
  const event = await createEvent(db, validEventInput({ name: "Transmisión anterior", status: "published", streamUrl: "https://example.com/legacy" }), "admin-1");
  expect((await getPublicEventBySlug(db, event.slug))?.watchPlatforms).toEqual([{ name: "Transmisión oficial", url: "https://example.com/legacy", media: null }]);
  const input = { ...validEventInput(), watchPlatforms: JSON.stringify([{ name: "Nuevo canal", url: "https://example.com/new", mediaId: null }]) };
  await updateEvent(db, event.id, input, "admin-1");
  expect((await getPublicEventBySlug(db, event.slug))?.watchPlatforms).toEqual([{ name: "Nuevo canal", url: "https://example.com/new", media: null }]);
});

it("rejects invalid platform names, unsafe links and too many platforms", async () => {
  for (const watchPlatforms of [
    [{ name: "", url: "https://example.com", mediaId: null }],
    [{ name: "Canal", url: "javascript:alert(1)", mediaId: null }],
    Array.from({ length: 13 }, () => ({ name: "Canal", url: "https://example.com", mediaId: null })),
  ]) {
    await expect(createEvent(db, { ...validEventInput(), watchPlatforms }, "admin-1")).rejects.toThrow();
  }
});

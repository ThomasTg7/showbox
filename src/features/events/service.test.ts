import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { auditLog } from "@/db/schema/audit";
import { cardSegments, eventGallery, events } from "@/db/schema/events";
import { insertMedia } from "@/features/fighters/test-helpers";
import { toLocalInputs } from "@/lib/local-time";
import { createTestDb } from "@/test/db";
import { createEvent, deleteEvent, duplicateEvent, setEventPublication, updateEvent } from "./service";
import { insertSegment, validEventInput } from "./test-helpers";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

const auditRows = (entityId: string) => db.select().from(auditLog).where(eq(auditLog.entityId, entityId));
const findEvent = async (id: string) => (await db.select().from(events).where(eq(events.id, id)))[0]!;
const MISSING = "00000000-0000-4000-8000-000000000000";

describe("createEvent", () => {
  it("accepts the same ready 4:5 image as mobile cover and poster in either direction", async () => {
    for (const kind of ["event_hero_mobile", "event_poster"] as const) {
      const image = await insertMedia(db, kind);
      const { id } = await createEvent(db, validEventInput({ name: `Shared ${kind}`, heroMobileMediaId: image, posterMediaId: image }), "admin-1");
      expect(await findEvent(id)).toMatchObject({ heroMobileMediaId: image, posterMediaId: image });
    }
    const gallery = await insertMedia(db, "gallery");
    await expect(createEvent(db, validEventInput({ heroMobileMediaId: gallery }), "admin-1")).rejects.toThrow("La imagen ya no está disponible");
  });

  it("creates a draft with a slug from the name, the date in Chile time and an audit row", async () => {
    const { id, slug } = await createEvent(db, validEventInput(), "admin-1");
    expect(slug).toBe("showbox-fight-night-9");

    const row = await findEvent(id);
    expect(row).toMatchObject({ status: "draft", eventStatus: "scheduled", venueCity: "Santiago", doorsAt: null, endsEstimatedAt: null });
    expect(toLocalInputs(row.startsAt)).toEqual({ date: "2026-11-14", time: "21:00" });
    expect(await auditRows(id)).toHaveLength(1);
  });

  it("adds a numeric suffix when the slug is taken", async () => {
    expect((await createEvent(db, validEventInput(), "admin-1")).slug).toBe("showbox-fight-night-9-2");
  });

  it("reads the doors and the estimated end as times of the event day, the end rolling past midnight", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Con horarios", doorsTime: "19:30", endsTime: "00:30" }), "admin-1");
    const row = await findEvent(id);
    expect(toLocalInputs(row.doorsAt!)).toEqual({ date: "2026-11-14", time: "19:30" });
    expect(toLocalInputs(row.endsEstimatedAt!)).toEqual({ date: "2026-11-15", time: "00:30" });
  });

  it("rejects doors after the start, an impossible date and a missing venue", async () => {
    await expect(createEvent(db, validEventInput({ doorsTime: "22:00" }), "admin-1")).rejects.toThrow("La apertura de puertas no puede ser después del inicio");
    await expect(createEvent(db, validEventInput({ startsDate: "2026-02-30" }), "admin-1")).rejects.toThrow("La fecha no es válida");
    await expect(createEvent(db, validEventInput({ venueName: "" }), "admin-1")).rejects.toThrow("El recinto es obligatorio");
  });

  it("wants latitude and longitude together", async () => {
    await expect(createEvent(db, validEventInput({ lat: "-33.44" }), "admin-1")).rejects.toThrow("Indica latitud y longitud");
    const { id } = await createEvent(db, validEventInput({ name: "Con mapa", lat: "-33,4489", lng: -70.6693 }), "admin-1");
    expect(await findEvent(id)).toMatchObject({ lat: -33.4489, lng: -70.6693 });
  });

  it("stores the ticket tiers, accepting them as JSON text from a form", async () => {
    const tiers = [{ name: "General", description: "Galería", priceClp: 15000, soldOut: false }];
    const { id } = await createEvent(db, validEventInput({ name: "Con entradas", ticketUrl: "https://tickets.example.cl/gc", ticketTiers: JSON.stringify(tiers) }), "admin-1");
    expect(await findEvent(id)).toMatchObject({ ticketTiers: tiers, ticketUrl: "https://tickets.example.cl/gc" });
    await expect(createEvent(db, validEventInput({ ticketUrl: "javascript:alert(1)" }), "admin-1")).rejects.toThrow("no es un enlace válido");
    await expect(
      createEvent(db, validEventInput({ ticketTiers: [{ name: "", description: "", priceClp: 100, soldOut: false }] }), "admin-1"),
    ).rejects.toThrow();
  });

  it("requires a date for a scheduled publication", async () => {
    await expect(createEvent(db, validEventInput({ status: "scheduled" }), "admin-1")).rejects.toThrow("Elige fecha y hora");
    const { id } = await createEvent(db, validEventInput({ name: "Ya publicado", status: "published" }), "admin-1");
    expect(await findEvent(id)).toMatchObject({ status: "published", publishAt: null });
  });

  it("stores the images and the gallery in order, and rejects one that is missing or of another kind", async () => {
    const hero = await insertMedia(db, "event_hero");
    const poster = await insertMedia(db, "event_poster");
    const [first, second] = [await insertMedia(db, "gallery"), await insertMedia(db, "gallery")];
    const { id } = await createEvent(
      db,
      validEventInput({ name: "Con imágenes", heroMediaId: hero, posterMediaId: poster, heroMobileMediaId: "", galleryMediaIds: [second!, first!] }),
      "admin-1",
    );
    expect(await findEvent(id)).toMatchObject({ heroMediaId: hero, posterMediaId: poster, heroMobileMediaId: null });
    const gallery = await db.select().from(eventGallery).where(eq(eventGallery.eventId, id)).orderBy(asc(eventGallery.sortOrder));
    expect(gallery.map((row) => row.mediaId)).toEqual([second, first]);

    await expect(createEvent(db, validEventInput({ heroMediaId: MISSING }), "admin-1")).rejects.toThrow("La imagen ya no está disponible");
    await expect(createEvent(db, validEventInput({ posterMediaId: hero }), "admin-1")).rejects.toThrow("La imagen ya no está disponible");
    await expect(createEvent(db, validEventInput({ galleryMediaIds: [poster] }), "admin-1")).rejects.toThrow("La imagen ya no está disponible");
  });
});

describe("updateEvent", () => {
  it("edits the data, keeps the slug and audits", async () => {
    const { id, slug } = await createEvent(db, validEventInput({ name: "Para editar" }), "admin-1");
    const result = await updateEvent(db, id, validEventInput({ name: "Nombre nuevo", startsTime: "20:30", venueCity: "Valparaíso" }), "admin-1");
    expect(result.slug).toBe(slug);
    const row = await findEvent(id);
    expect(row).toMatchObject({ name: "Nombre nuevo", venueCity: "Valparaíso" });
    expect(toLocalInputs(row.startsAt).time).toBe("20:30");
    expect((await auditRows(id)).map((entry) => entry.action).sort()).toEqual(["create", "update"]);
  });

  it("moves the start time of each block to the new day when the event changes date, keeping its hour", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Cambia de fecha" }), "admin-1");
    const [segment] = await db
      .insert(cardSegments)
      .values([
        { eventId: id, name: "Preliminares", sortOrder: 1, startsAt: new Date("2026-11-15T00:00:00Z") }, // 19:00 en Ecuador
        { eventId: id, name: "Sin hora", sortOrder: 2 },
      ])
      .returning({ id: cardSegments.id });

    await updateEvent(db, id, validEventInput({ name: "Cambia de fecha", startsDate: "2026-11-21" }), "admin-1");
    const rows = await db.select().from(cardSegments).where(eq(cardSegments.eventId, id)).orderBy(asc(cardSegments.sortOrder));
    expect(toLocalInputs(rows.find((row) => row.id === segment!.id)!.startsAt!)).toEqual({ date: "2026-11-21", time: "19:00" });
    expect(rows.find((row) => row.name === "Sin hora")!.startsAt).toBeNull();
  });

  it("changes the slug only when a different one is written, and refuses a taken one", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Enlace" }), "admin-1");
    expect((await updateEvent(db, id, validEventInput({ name: "Enlace", slug: "enlace-nuevo" }), "admin-1")).slug).toBe("enlace-nuevo");
    await expect(updateEvent(db, id, validEventInput({ name: "Enlace", slug: "showbox-fight-night-9" }), "admin-1")).rejects.toThrow("Ese enlace ya lo usa otro evento");
  });

  it("does not touch the publication unless a status comes with the data", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Publicado", status: "published" }), "admin-1");
    await updateEvent(db, id, validEventInput({ name: "Publicado" }), "admin-1");
    expect((await findEvent(id)).status).toBe("published");
    await updateEvent(db, id, validEventInput({ name: "Publicado", status: "draft" }), "admin-1");
    expect((await findEvent(id)).status).toBe("draft");
  });

  it("keeps the status the night console set when the form was opened before it and the admin did not touch the status", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Form viejo" }), "admin-1");
    await db.update(events).set({ eventStatus: "completed" }).where(eq(events.id, id));
    await updateEvent(db, id, validEventInput({ name: "Form viejo", eventStatus: "scheduled", eventStatusBefore: "scheduled" }), "admin-1");
    expect((await findEvent(id)).eventStatus).toBe("completed");
  });

  it("applies the status the admin changed in the form, whatever the event has now", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Cancelado a mano" }), "admin-1");
    await db.update(events).set({ eventStatus: "live" }).where(eq(events.id, id));
    await updateEvent(db, id, validEventInput({ name: "Cancelado a mano", eventStatus: "cancelled", eventStatusBefore: "scheduled" }), "admin-1");
    expect((await findEvent(id)).eventStatus).toBe("cancelled");
  });

  it("rewrites the gallery, sets the event status and rejects a missing event", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Galería" }), "admin-1");
    const [a, b] = [await insertMedia(db, "gallery"), await insertMedia(db, "gallery")];
    await updateEvent(db, id, validEventInput({ name: "Galería", galleryMediaIds: [a!, b!], eventStatus: "cancelled" }), "admin-1");
    await updateEvent(db, id, validEventInput({ name: "Galería", galleryMediaIds: [b!] }), "admin-1");
    const gallery = await db.select().from(eventGallery).where(eq(eventGallery.eventId, id));
    expect(gallery.map((row) => row.mediaId)).toEqual([b]);
    expect((await findEvent(id)).eventStatus).toBe("cancelled");
    await expect(updateEvent(db, MISSING, validEventInput(), "admin-1")).rejects.toThrow("No se encontró el evento");
  });
});

describe("setEventPublication and deleteEvent", () => {
  it("publishes, schedules and audits", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Publicar" }), "admin-1");
    await setEventPublication(db, id, { status: "published", publishAt: null }, "admin-1");
    expect((await findEvent(id)).status).toBe("published");
    const when = new Date(Date.now() + 86_400_000);
    await setEventPublication(db, id, { status: "scheduled", publishAt: when }, "admin-1");
    expect(await findEvent(id)).toMatchObject({ status: "scheduled", publishAt: when });
    await expect(setEventPublication(db, id, { status: "scheduled", publishAt: null }, "admin-1")).rejects.toThrow("Elige fecha y hora");
    expect((await auditRows(id)).filter((entry) => entry.action === "publish")).toHaveLength(2);
  });

  it("sends an event to the trash once and says so the second time", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "A la papelera" }), "admin-1");
    await deleteEvent(db, id, "admin-1");
    expect((await findEvent(id)).deletedAt).not.toBeNull();
    await expect(deleteEvent(db, id, "admin-1")).rejects.toThrow("No se encontró el evento");
    await expect(updateEvent(db, id, validEventInput(), "admin-1")).rejects.toThrow("No se encontró el evento");
  });
});

describe("duplicateEvent", () => {
  it("copies the data and the blocks, as a draft without bouts, images or gallery", async () => {
    const hero = await insertMedia(db, "event_hero");
    const { id } = await createEvent(
      db,
      validEventInput({ name: "Original", status: "published", heroMediaId: hero, ticketUrl: "https://tickets.example.cl/x", doorsTime: "19:30" }),
      "admin-1",
    );
    await insertSegment(db, id, "Cartelera estelar", 0);
    await insertSegment(db, id, "Preliminares", 1);

    const copy = await duplicateEvent(db, id, "admin-1");
    expect(copy.slug).toBe("original-copia");

    const row = await findEvent(copy.id);
    expect(row).toMatchObject({ name: "Original (copia)", status: "draft", eventStatus: "scheduled", heroMediaId: null, ticketUrl: "https://tickets.example.cl/x", number: null });
    expect(row.startsAt).toEqual((await findEvent(id)).startsAt);
    expect(row.doorsAt).toEqual((await findEvent(id)).doorsAt);
    expect(await db.select().from(eventGallery).where(eq(eventGallery.eventId, copy.id))).toEqual([]);

    const segments = await db.select().from(cardSegments).where(eq(cardSegments.eventId, copy.id)).orderBy(asc(cardSegments.sortOrder));
    expect(segments.map((segment) => segment.name)).toEqual(["Cartelera estelar", "Preliminares"]);
    expect((await auditRows(copy.id))[0]).toMatchObject({ action: "create" });
  });

  it("takes a free slug each time and rejects a missing event", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Repetido" }), "admin-1");
    expect((await duplicateEvent(db, id, "admin-1")).slug).toBe("repetido-copia");
    expect((await duplicateEvent(db, id, "admin-1")).slug).toBe("repetido-copia-2");
    await expect(duplicateEvent(db, MISSING, "admin-1")).rejects.toThrow("No se encontró el evento");
  });
});

describe("the Google Maps link of an event", () => {
  const PLACE = "https://www.google.com/maps/place/Arena/@-33.44,-70.66,17z/data=!3d-33.4372!4d-70.6506";

  it("saves the coordinates of the pasted link, on create and on update", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Con mapa", mapsUrl: PLACE }), "admin-1");
    expect(await findEvent(id)).toMatchObject({ lat: -33.4372, lng: -70.6506 });

    await updateEvent(db, id, validEventInput({ name: "Con mapa", mapsUrl: "https://www.google.com/maps/@-33.1,-71.2,15z" }), "admin-1");
    expect(await findEvent(id)).toMatchObject({ lat: -33.1, lng: -71.2 });
  });

  it("clears the map when the link is emptied", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Sin mapa luego", mapsUrl: PLACE }), "admin-1");
    await updateEvent(db, id, validEventInput({ name: "Sin mapa luego", mapsUrl: "" }), "admin-1");
    expect(await findEvent(id)).toMatchObject({ lat: null, lng: null });
  });

  it("keeps working with explicit coordinates when no link comes", async () => {
    const { id } = await createEvent(db, validEventInput({ name: "Coordenadas", lat: "-33.5", lng: "-70.5" }), "admin-1");
    expect(await findEvent(id)).toMatchObject({ lat: -33.5, lng: -70.5 });
  });

  it("rejects a link that is not from Google Maps, and a Maps link that has no place in it", async () => {
    await expect(createEvent(db, validEventInput({ name: "Otro sitio", mapsUrl: "https://example.com/maps" }), "admin-1")).rejects.toThrow("enlace de Google Maps");
    await expect(createEvent(db, validEventInput({ name: "Sin lugar", mapsUrl: "https://www.google.com/maps/place/Arena+Santiago" }), "admin-1")).rejects.toThrow(
      "No pudimos leer la ubicación",
    );
  });
});

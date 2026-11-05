import type { Db } from "@/db";
import { media } from "@/db/schema/media";
import { sponsors } from "@/db/schema/sponsors";
import type { SponsorTier } from "@/domain/sponsors";
import { slugify } from "@/domain/slug";
import { getStorage, type StorageDriver } from "@/lib/storage";

const SEED_SPONSORS: { name: string; tier: SponsorTier; url: string }[] = [
  { name: "IronGym", tier: "principal", url: "https://example.com/irongym" },
  { name: "Kaizen Fightwear", tier: "oficial", url: "https://example.com/kaizen" },
  { name: "Proteína+", tier: "oficial", url: "https://example.com/proteina" },
  { name: "Clínica Deportiva", tier: "colaborador", url: "https://example.com/clinica" },
];

/** Logo de demostración: el nombre sobre una placa oscura (se ve igual sobre el fondo negro del sitio y el claro del panel). */
function logoSvg(name: string): string {
  const escaped = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" role="img" aria-label="${escaped}"><rect width="600" height="300" fill="#161616"/><rect x="12" y="12" width="576" height="276" fill="none" stroke="#FFB400" stroke-width="6"/><text x="300" y="168" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="64" fill="#FFFFFF">${escaped}</text></svg>`;
}

/** Cuatro patrocinadores de demostración (uno por nivel, dos oficiales). No hace nada si ya hay alguno: no pisa lo que cargó la promotora. */
export async function seedSponsors(db: Db, storage: StorageDriver = getStorage()): Promise<void> {
  const [existing] = await db.select({ id: sponsors.id }).from(sponsors).limit(1);
  if (existing) return;

  for (const [index, sponsor] of SEED_SPONSORS.entries()) {
    const originalKey = `originals/sponsor_logo/seed-${slugify(sponsor.name)}.svg`;
    await storage.put(originalKey, Buffer.from(logoSvg(sponsor.name), "utf8"), "image/svg+xml");
    const [logo] = await db
      .insert(media)
      .values({ kind: "sponsor_logo", originalKey, mime: "image/svg+xml", width: 600, height: 300, alt: sponsor.name, status: "ready" })
      .returning({ id: media.id });
    await db.insert(sponsors).values({ name: sponsor.name, url: sponsor.url, tier: sponsor.tier, logoMediaId: logo!.id, sortOrder: index });
  }
}

import { db, type Db } from "@/db";
import { seedDivisions } from "@/features/divisions/seed";
import { seedEvents } from "@/features/events/seed";
import { seedRankings } from "@/features/rankings/seed";
import { seedFighters } from "@/features/fighters/seed";
import { seedPosts } from "@/features/posts/seed";
import { seedSponsors } from "@/features/sponsors/seed";

export async function seed(db: Db): Promise<void> {
  await seedDivisions(db);
  await seedFighters(db);
  await seedEvents(db);
  await seedPosts(db);
  await seedRankings(db);
  await seedSponsors(db);
  // Cada plan agrega aquí su propio seedX(db).
}

seed(db)
  .then(() => {
    console.info("Seed completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { desc } from "drizzle-orm";
import type { Db } from "@/db";
import { allowedEmails } from "@/db/schema/auth";

export type AllowedEmailRow = {
  email: string;
  addedBy: string | null;
  createdAt: Date;
};

export async function listAllowedEmails(db: Db): Promise<AllowedEmailRow[]> {
  return db.select().from(allowedEmails).orderBy(desc(allowedEmails.createdAt));
}

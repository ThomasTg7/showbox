import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { listCountries } from "@/domain/countries";
import { listDivisions } from "@/features/divisions/queries";
import { createFighterAction } from "@/features/fighters/actions";
import { FighterForm } from "@/features/fighters/components/fighter-form";
import { EMPTY_FIGHTER_VALUES } from "@/features/fighters/form-values";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Nuevo boxeador" };

export default async function AdminNuevoBoxeadorPage() {
  await requireAdmin();
  const divisions = await listDivisions(db, { activeOnly: true });

  return (
    <AdminPage title="Nuevo boxeador">
      <FighterForm
        action={createFighterAction}
        defaults={EMPTY_FIGHTER_VALUES}
        divisions={divisions}
        countries={listCountries()}
        publication={{ status: "draft", publishAt: null }}
        isEdit={false}
      />
    </AdminPage>
  );
}

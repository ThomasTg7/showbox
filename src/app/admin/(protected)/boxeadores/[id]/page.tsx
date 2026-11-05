import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { listCountries } from "@/domain/countries";
import { listDivisions } from "@/features/divisions/queries";
import { createFighterPreviewLinkAction, updateFighterAction } from "@/features/fighters/actions";
import { FighterForm } from "@/features/fighters/components/fighter-form";
import { fighterToFormValues } from "@/features/fighters/form-values";
import { getFighterForEdit } from "@/features/fighters/admin-queries";
import { fighterIdSchema } from "@/features/fighters/schema";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Editar boxeador" };

export default async function AdminEditarBoxeadorPage({ params, searchParams }: PageProps<"/admin/boxeadores/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!fighterIdSchema.safeParse(id).success) notFound();
  const [edit, divisions, query] = await Promise.all([getFighterForEdit(db, id), listDivisions(db), searchParams]);
  if (!edit) notFound();

  const { fighter, bodyMedia, headshotMedia, gallery } = edit;
  return (
    <AdminPage title={`${fighter.firstName} ${fighter.lastName}`}>
      <FighterForm
        action={updateFighterAction.bind(null, fighter.id)}
        defaults={fighterToFormValues(fighter)}
        divisions={divisions}
        countries={listCountries()}
        bodyMedia={bodyMedia}
        headshotMedia={headshotMedia}
        gallery={gallery}
        publication={{ status: fighter.status, publishAt: fighter.publishAt }}
        previewHref={createFighterPreviewLinkAction.bind(null, fighter.id)}
        isEdit
        justCreated={query.creado === "1"}
      />
    </AdminPage>
  );
}

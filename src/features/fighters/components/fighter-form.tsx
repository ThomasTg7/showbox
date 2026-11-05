"use client";

import { adminPath } from "@/lib/site-urls";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormFieldsProvider } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Division } from "@/db/schema/divisions";
import type { Country } from "@/domain/countries";
import type { MediaDTO } from "@/features/media/dto";
import { PublicationControls } from "@/features/publication/components/publication-controls";
import { isPublicationValid, type PublicationValue } from "@/features/publication/schedule";
import type { FormActionState } from "@/lib/form-errors";
import { FIELD_TABS, tabForField, type FighterFormValues, type FighterTab } from "../form-values";
import { FighterDataTab } from "./fighter-data-tab";
import { FighterPhotosTab } from "./fighter-photos-tab";
import { FighterPhysicalTab } from "./fighter-physical-tab";
import { FighterRecordTab } from "./fighter-record-tab";
import { FighterSocialsTab } from "./fighter-socials-tab";

const TAB_LABELS: Record<FighterTab, string> = {
  data: "Datos",
  physical: "Físico",
  record: "Récord total",
  photos: "Fotos",
  socials: "Redes",
  publication: "Publicación",
};

type FighterFormProps = {
  /** Acción del formulario; al editar ya trae el id (`updateFighterAction.bind(null, id)`). */
  action: (previous: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults: FighterFormValues;
  divisions: Division[];
  countries: Country[];
  bodyMedia?: MediaDTO | null;
  headshotMedia?: MediaDTO | null;
  gallery?: MediaDTO[];
  publication: PublicationValue;
  /** Solo al editar: enlace de vista previa (o su generador). */
  previewHref?: () => Promise<string | null>;
  isEdit: boolean;
  justCreated?: boolean;
};

export function FighterForm({ action, defaults, divisions, countries, bodyMedia = null, headshotMedia = null, gallery = [], publication: initialPublication, previewHref, isEdit, justCreated }: FighterFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<FighterTab>("data");
  const [state, formAction, isSaving] = useActionState(async (previous: FormActionState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.redirectTo) router.replace(result.redirectTo);
    if (result.success) toast.success(result.success);
    if (result.error) toast.error(result.error);
    // Abre la primera pestaña que tenga un error para que se vea junto al campo.
    const firstTab = Object.keys(result.fieldErrors ?? {}).map(tabForField).find(Boolean);
    if (firstTab) setTab(firstTab);
    return result;
  }, {});
  const [, startTransition] = useTransition();
  const [publication, setPublication] = useState(initialPublication);
  const errors = state.fieldErrors ?? {};
  const tabsWithErrors = new Set(Object.keys(errors).map(tabForField));

  useEffect(() => {
    if (justCreated) toast.success("Boxeador creado. Sigue completando su ficha o publícalo cuando esté listo.");
  }, [justCreated]);

  // Sin `<form action>`: React vaciaría los campos tras cada guardado. Así lo escrito se conserva.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FormFieldsProvider value={{ defaults, errors, idPrefix: "fighter" }}>
        <Tabs value={tab} onValueChange={(value) => setTab(value as FighterTab)}>
          <TabsList variant="line" className="h-auto w-full flex-wrap group-data-horizontal/tabs:h-auto justify-start gap-x-1 gap-y-1.5 pb-2">
            {(Object.keys(FIELD_TABS) as FighterTab[]).map((key) => (
              <TabsTrigger key={key} value={key} className="flex-none px-3">
                {TAB_LABELS[key]}
                {tabsWithErrors.has(key) ? <span aria-label="tiene errores" className="size-2 rounded-full bg-destructive" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Todas las pestañas quedan montadas (ocultas): sus campos se envían aunque no estén a la vista. */}
          <TabsContent value="data" forceMount className="pt-6" hidden={tab !== "data"}>
            <FighterDataTab divisions={divisions} countries={countries} defaults={{ gender: defaults.gender, divisionId: defaults.divisionId }} showSlug={isEdit} />
          </TabsContent>
          <TabsContent value="physical" forceMount className="pt-6" hidden={tab !== "physical"}>
            <FighterPhysicalTab />
          </TabsContent>
          <TabsContent value="record" forceMount className="pt-6" hidden={tab !== "record"}>
            <FighterRecordTab />
          </TabsContent>
          <TabsContent value="photos" forceMount className="pt-6" hidden={tab !== "photos"}>
            <FighterPhotosTab bodyMedia={bodyMedia} headshotMedia={headshotMedia} gallery={gallery} />
          </TabsContent>
          <TabsContent value="socials" forceMount className="pt-6" hidden={tab !== "socials"}>
            <FighterSocialsTab />
          </TabsContent>
          <TabsContent value="publication" forceMount className="pt-6" hidden={tab !== "publication"}>
            <PublicationControls {...publication} onChange={setPublication} previewHref={previewHref} />
            {errors.publishAt ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {errors.publishAt}
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      </FormFieldsProvider>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {/* En celular el botón principal queda fijo abajo. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-border bg-background p-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button type="submit" disabled={isSaving || !isPublicationValid(publication)} className="flex-1 sm:flex-none">
          {isSaving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear boxeador"}
        </Button>
        <Button asChild variant="outline">
          <Link href={adminPath("/boxeadores")}>Volver al listado</Link>
        </Button>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormFieldsProvider } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TicketTier } from "@/db/schema/events";
import type { MediaDTO } from "@/features/media/dto";
import { PublicationControls } from "@/features/publication/components/publication-controls";
import { isPublicationValid, type PublicationValue } from "@/features/publication/schedule";
import type { FormActionState } from "@/lib/form-errors";
import { adminPath } from "@/lib/site-urls";
import { EVENT_FIELD_TABS, tabForEventField, type EventFormValues, type EventTab } from "../form-values";
import { EventDataTab, EventImagesTab, EventPlaceTab, EventTicketsTab } from "./event-tabs";
import { WatchPlatformsField } from "./watch-platforms-field";
import type { WatchPlatformDTO } from "../dto";

const TAB_LABELS: Record<EventTab, string> = {
  data: "Datos",
  place: "Horarios y lugar",
  images: "Imágenes",
  tickets: "Entradas",
  watch: "Dónde ver",
  publication: "Publicación",
};

type EventFormProps = {
  /** Acción del formulario; al editar ya trae el id (`updateEventAction.bind(null, id)`). */
  action: (previous: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults: EventFormValues;
  heroMedia?: MediaDTO | null;
  heroMobileMedia?: MediaDTO | null;
  posterMedia?: MediaDTO | null;
  gallery?: MediaDTO[];
  tiers?: TicketTier[];
  watchPlatforms?: WatchPlatformDTO[];
  publication: PublicationValue;
  /** Solo al editar: enlace de vista previa (o su generador). */
  previewHref?: () => Promise<string | null>;
  isEdit: boolean;
  isLive?: boolean;
  justCreated?: boolean;
};

export function EventForm({
  action,
  defaults,
  heroMedia = null,
  heroMobileMedia = null,
  posterMedia = null,
  gallery = [],
  tiers = [],
  watchPlatforms = [],
  publication: initialPublication,
  previewHref,
  isEdit,
  isLive = false,
  justCreated,
}: EventFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<EventTab>("data");
  const [state, formAction, isSaving] = useActionState(async (previous: FormActionState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.redirectTo) router.replace(result.redirectTo);
    if (result.success) toast.success(result.success);
    if (result.error) toast.error(result.error);
    // Abre la primera pestaña que tenga un error para que se vea junto al campo.
    const firstTab = Object.keys(result.fieldErrors ?? {}).map(tabForEventField).find(Boolean);
    if (firstTab) setTab(firstTab);
    return result;
  }, {});
  const [, startTransition] = useTransition();
  const [publication, setPublication] = useState(initialPublication);
  const errors = state.fieldErrors ?? {};
  const tabsWithErrors = new Set(Object.keys(errors).map(tabForEventField));

  useEffect(() => {
    if (justCreated) toast.success("Evento creado. Arma la cartelera o publícalo cuando esté listo.");
  }, [justCreated]);

  // Sin `<form action>`: React vaciaría los campos tras cada guardado. Así lo escrito se conserva.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* El estado con que se abrió el formulario: el servidor solo aplica el «Estado del evento» si el admin lo cambió. */}
      <input type="hidden" name="eventStatusBefore" value={defaults.eventStatus ?? ""} />
      <input type="hidden" name="streamUrl" value={defaults.streamUrl ?? ""} />
      <FormFieldsProvider value={{ defaults, errors, idPrefix: "event" }}>
        <Tabs value={tab} onValueChange={(value) => setTab(value as EventTab)}>
          <TabsList variant="line" className="h-auto w-full flex-wrap group-data-horizontal/tabs:h-auto justify-start gap-x-1 gap-y-1.5 pb-2">
            {(Object.keys(EVENT_FIELD_TABS) as EventTab[]).map((key) => (
              <TabsTrigger key={key} value={key} className="flex-none px-3">
                {TAB_LABELS[key]}
                {tabsWithErrors.has(key) ? <span aria-label="tiene errores" className="size-2 rounded-full bg-destructive" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Todas las pestañas quedan montadas (ocultas): sus campos se envían aunque no estén a la vista. */}
          <TabsContent value="data" forceMount className="pt-6" hidden={tab !== "data"}>
            <EventDataTab showSlug={isEdit} isLive={isLive} />
          </TabsContent>
          <TabsContent value="place" forceMount className="pt-6" hidden={tab !== "place"}>
            <EventPlaceTab />
          </TabsContent>
          <TabsContent value="images" forceMount className="pt-6" hidden={tab !== "images"}>
            <EventImagesTab heroMedia={heroMedia} heroMobileMedia={heroMobileMedia} posterMedia={posterMedia} gallery={gallery} />
            {["heroMediaId", "heroMobileMediaId", "posterMediaId", "galleryMediaIds"].map((field) =>
              errors[field] ? (
                <p key={field} role="alert" className="mt-2 text-sm text-destructive">
                  {errors[field]}
                </p>
              ) : null,
            )}
          </TabsContent>
          <TabsContent value="tickets" forceMount className="pt-6" hidden={tab !== "tickets"}>
            <EventTicketsTab tiers={tiers} tiersError={errors.ticketTiers} />
          </TabsContent>
          <TabsContent value="publication" forceMount className="pt-6" hidden={tab !== "publication"}>
            <PublicationControls {...publication} onChange={setPublication} previewHref={previewHref} />
            {errors.publishAt ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {errors.publishAt}
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="watch" forceMount className="pt-6" hidden={tab !== "watch"}>
            <WatchPlatformsField initial={watchPlatforms} error={errors.watchPlatforms} />
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
          {isSaving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear evento"}
        </Button>
        <Button asChild variant="outline">
          <Link href={adminPath("/eventos")}>Volver al listado</Link>
        </Button>
      </div>
    </form>
  );
}

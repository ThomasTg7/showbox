"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/admin/form-field";
import { FormFieldsProvider, SelectField, TextField } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { SPONSOR_TIER_LABELS, SPONSOR_TIERS } from "@/domain/sponsors";
import { MediaField } from "@/features/media/components/media-field";
import { RelatedPicker, type RelatedOption } from "@/features/posts/components/related-picker";
import type { FormActionState } from "@/lib/form-errors";
import { saveSponsorAction, searchEventsForSponsorAction } from "../actions";
import type { AdminSponsorRow } from "../dto";

type SponsorFormProps = {
  /** `null` cierra el diálogo; `"new"` crea; un patrocinador lo edita. */
  target: AdminSponsorRow | "new" | null;
  onClose: () => void;
};

async function searchEvents(query: string): Promise<RelatedOption[]> {
  return (await searchEventsForSponsorAction(query)).map((event) => ({ id: event.id, label: event.name }));
}

/** Interruptor con el área táctil de 44 px y el valor en un campo oculto (un `<input>` sin marcar no se envía). */
function SwitchField({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
      <input type="hidden" name={name} value={String(checked)} />
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function SponsorFormBody({ sponsor, onClose }: { sponsor: AdminSponsorRow | null; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(async (_previous: FormActionState, formData: FormData) => {
    const result = await saveSponsorAction(sponsor?.id ?? null, formData);
    if (result.success) {
      toast.success(result.success);
      onClose();
    }
    return result;
  }, {});
  const [, startTransition] = useTransition();
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const [allEvents, setAllEvents] = useState(sponsor?.allEvents ?? true);
  const [active, setActive] = useState(sponsor?.active ?? true);

  // Sin `<form action>`: React lo reinicia tras cada respuesta y los interruptores volverían a su valor inicial.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const defaults = {
    name: values.name ?? sponsor?.name ?? "",
    url: values.url ?? sponsor?.url ?? "",
    tier: values.tier ?? sponsor?.tier ?? "oficial",
    startsOn: values.startsOn ?? sponsor?.startsOn ?? "",
    endsOn: values.endsOn ?? sponsor?.endsOn ?? "",
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{sponsor ? "Editar patrocinador" : "Nuevo patrocinador"}</DialogTitle>
        <DialogDescription>Aparece en la home, en la página de sus eventos y en el pie de página según su nivel.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormFieldsProvider value={{ defaults, errors, idPrefix: "sponsor" }}>
          <TextField name="name" label="Nombre" maxLength={80} autoComplete="off" required />
          <FormField
            id="sponsor-logo"
            label="Logo"
            error={errors.logoMediaId}
            hint="Mejor PNG o SVG sin fondo."
          >
            <MediaField kind="sponsor_logo" name="logoMediaId" media={sponsor?.logo ?? null} />
          </FormField>
          <TextField name="url" label="Sitio web" type="url" autoCapitalize="none" placeholder="https://" hint="Opcional. El logo enlaza a esta dirección." />
          <SelectField name="tier" label="Nivel" hint="El principal se muestra más grande y es el único que sale en el pie de página.">
            {SPONSOR_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {SPONSOR_TIER_LABELS[tier]}
              </option>
            ))}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="startsOn" label="Visible desde" type="date" hint="Vacío: desde ya." />
            <TextField name="endsOn" label="Visible hasta" type="date" hint="Vacío: sin fecha de término. Se oculta al terminar ese día." />
          </div>
        </FormFieldsProvider>

        <SwitchField name="allEvents" label="Todos los eventos" checked={allEvents} onChange={setAllEvents} />
        {/* Siempre montado (oculto): lo elegido no se pierde al alternar el interruptor. */}
        <div hidden={allEvents} className="flex flex-col gap-2">
          <RelatedPicker
            name="eventIds"
            label="Eventos del patrocinador"
            hint="Aún no hay eventos. Busca por nombre."
            placeholder="Buscar evento"
            initial={(sponsor?.events ?? []).map((event) => ({ id: event.id, label: event.name, isPublic: true }))}
            search={searchEvents}
            hiddenNote=""
          />
          {errors.eventIds ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.eventIds}
            </p>
          ) : null}
        </div>
        <SwitchField name="active" label="Visible en el sitio" checked={active} onChange={setActive} />

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function SponsorForm({ target, onClose }: SponsorFormProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        {/* El contenido se desmonta al cerrar: cada apertura empieza sin errores ni valores viejos. */}
        <SponsorFormBody sponsor={target && target !== "new" ? target : null} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

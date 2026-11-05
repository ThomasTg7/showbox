"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { FormField, formFieldErrorId } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Division } from "@/db/schema/divisions";
import type { FormActionState } from "@/lib/form-errors";
import { saveDivisionAction } from "../actions";

type DivisionFormProps = {
  /** `null` cierra el diálogo; `"new"` crea; una división la edita. */
  target: Division | "new" | null;
  onClose: () => void;
};

function fieldProps(id: string, error?: string) {
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? formFieldErrorId(id) : undefined };
}

function DivisionFormBody({ division, onClose }: { division: Division | null; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(
    async (_previous: FormActionState, formData: FormData) => {
      const result = await saveDivisionAction(formData);
      if (result.success) {
        toast.success(result.success);
        onClose();
      }
      return result;
    },
    {},
  );
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <>
      <DialogHeader>
        <DialogTitle>{division ? "Editar división" : "Nueva división"}</DialogTitle>
        <DialogDescription>El límite es el peso máximo de la división, en kilos.</DialogDescription>
      </DialogHeader>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={division?.id ?? ""} />
        <FormField id="division-name" label="Nombre" error={errors.name}>
          <Input {...fieldProps("division-name", errors.name)} name="name" defaultValue={values.name ?? division?.name} placeholder="Ligero" required />
        </FormField>
        <FormField id="division-gender" label="Categoría" error={errors.gender}>
          <Select name="gender" defaultValue={values.gender ?? division?.gender ?? "male"}>
            <SelectTrigger {...fieldProps("division-gender", errors.gender)} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Masculina</SelectItem>
              <SelectItem value="female">Femenina</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="division-limit" label="Límite de peso (kg)" error={errors.limitKg}>
            <Input {...fieldProps("division-limit", errors.limitKg)} name="limitKg" type="number" step="0.1" min="0" inputMode="decimal" defaultValue={values.limitKg ?? division?.limitKg} required />
          </FormField>
          <FormField id="division-slots" label="Puestos en el ranking" error={errors.rankingSlots}>
            <Input {...fieldProps("division-slots", errors.rankingSlots)} name="rankingSlots" type="number" min="1" max="15" inputMode="numeric" defaultValue={values.rankingSlots ?? division?.rankingSlots ?? 5} required />
          </FormField>
        </div>
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

export function DivisionForm({ target, onClose }: DivisionFormProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {/* El contenido se desmonta al cerrar: cada apertura empieza sin errores ni valores viejos. */}
        <DivisionFormBody division={target && target !== "new" ? target : null} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

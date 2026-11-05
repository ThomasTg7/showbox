"use client";

import { useActionState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { FormFieldsProvider } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import type { FormActionState } from "@/lib/form-errors";
import { saveSettingAction } from "../actions";
import type { SettingKey } from "../registry";

type SettingFormProps = {
  settingKey: SettingKey;
  /** Valor inicial de los campos de texto, como texto. */
  values: Record<string, string>;
  /** Los campos; reciben los errores por campo del último intento para los que no son de texto simple (FAQ, textos). */
  children: (errors: Record<string, string>) => ReactNode;
};

/**
 * El formulario de una pestaña de Configuración: cada grupo se guarda por separado. Sin `<form action>` (React vaciaría los
 * campos tras guardar) y con el botón fijo abajo en celular.
 */
export function SettingForm({ settingKey, values, children }: SettingFormProps) {
  const [state, formAction, isSaving] = useActionState(async (previous: FormActionState, formData: FormData) => {
    const result = await saveSettingAction(settingKey, previous, formData);
    if (result.success) toast.success(result.success);
    if (result.error) toast.error(result.error);
    return result;
  }, {});
  const [, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
      <FormFieldsProvider value={{ defaults: values, errors, idPrefix: `setting-${settingKey}` }}>{children(errors)}</FormFieldsProvider>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-border bg-background p-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button type="submit" disabled={isSaving} className="flex-1 sm:flex-none">
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

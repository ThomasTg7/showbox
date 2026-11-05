"use client";

import { useActionState, useRef } from "react";
import { toast } from "sonner";
import { FormField, formFieldErrorId } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAllowedEmailAction, type AllowedEmailActionState } from "../actions";

export function InviteAdminForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    async (_previous: AllowedEmailActionState, formData: FormData) => {
      const result = await addAllowedEmailAction(formData);
      if (result.success) {
        toast.success(result.success);
        formRef.current?.reset();
      }
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <FormField id="new-admin-email" label="Correo del nuevo administrador" error={state.error}>
          <Input
            id="new-admin-email"
            name="email"
            type="email"
            placeholder="nombre@correo.cl"
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? formFieldErrorId("new-admin-email") : undefined}
          />
        </FormField>
      </div>
      <Button type="submit" disabled={isPending} className={state.error ? "sm:mb-7" : undefined}>
        {isPending ? "Enviando…" : "Dar acceso"}
      </Button>
    </form>
  );
}

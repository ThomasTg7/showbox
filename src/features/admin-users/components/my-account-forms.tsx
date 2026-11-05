"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FormField, formFieldErrorId } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormActionState } from "@/lib/form-errors";
import { NAME_MAX_LENGTH } from "../my-account-limits";
import { changeMyPasswordAction, updateMyNameAction } from "../my-account-actions";
import { ADMIN_PASSWORD_MIN_LENGTH } from "../password-policy";

const SECTION = "flex flex-col gap-4 border border-border bg-card p-4 sm:p-6";

/** Avisa con un toast cuando la action terminó bien. */
function useSuccessToast(state: FormActionState) {
  useEffect(() => {
    if (state.success) toast.success(state.success);
  }, [state]);
}

function invalid(error: string | undefined, id: string) {
  return { "aria-invalid": error ? true : undefined, "aria-describedby": error ? formFieldErrorId(id) : undefined };
}

export function MyNameForm({ name, email }: { name: string; email: string }) {
  const [state, action, isPending] = useActionState(updateMyNameAction, {});
  useSuccessToast(state);
  const error = state.fieldErrors?.name ?? state.error;

  return (
    <form action={action} className={SECTION} aria-labelledby="my-data-title">
      <h2 id="my-data-title" className="text-lg font-semibold">
        Tus datos
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField id="my-name" label="Nombre" hint="Así apareces en el historial de cambios." error={error}>
          <Input id="my-name" name="name" defaultValue={state.values?.name ?? name} maxLength={NAME_MAX_LENGTH} autoComplete="name" required {...invalid(error, "my-name")} />
        </FormField>
        <FormField id="my-email" label="Correo" hint="Es tu acceso al panel. Para usar otro, pide a otro administrador que le dé acceso.">
          <Input id="my-email" value={email} readOnly className="text-muted-foreground" />
        </FormField>
      </div>
      <div>
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Guardando…" : "Guardar nombre"}
        </Button>
      </div>
    </form>
  );
}

export function MyPasswordForm({ hasPassword, hasGoogle }: { hasPassword: boolean; hasGoogle: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, isPending] = useActionState(changeMyPasswordAction, {});
  useSuccessToast(state);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);
  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={action} className={SECTION} aria-labelledby="my-password-title">
      <div className="flex flex-col gap-1">
        <h2 id="my-password-title" className="text-lg font-semibold">
          {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasPassword
            ? "Al cambiarla, se cierra tu sesión en los demás dispositivos."
            : "Hoy entras solo con Google. Con una contraseña también podrás entrar con tu correo."}
          {hasGoogle && hasPassword ? " También puedes seguir entrando con Google." : ""}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {hasPassword ? (
          <FormField id="current-password" label="Contraseña actual" error={errors.currentPassword}>
            <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required {...invalid(errors.currentPassword, "current-password")} />
          </FormField>
        ) : null}
        <FormField id="new-password" label="Contraseña nueva" hint={`Mínimo ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`} error={errors.newPassword}>
          <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} {...invalid(errors.newPassword, "new-password")} />
        </FormField>
        <FormField id="confirm-password" label="Repite la contraseña nueva" error={errors.confirmation}>
          <Input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required {...invalid(errors.confirmation, "confirm-password")} />
        </FormField>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Guardando…" : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
        </Button>
      </div>
    </form>
  );
}

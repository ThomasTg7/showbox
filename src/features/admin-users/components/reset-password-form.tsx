"use client";

import { adminPath } from "@/lib/site-urls";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FormField, formFieldErrorId } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "../auth-errors";
import { ADMIN_PASSWORD_MIN_LENGTH, validateNewPassword, type NewPasswordErrors } from "../password-policy";

export function ResetPasswordForm({ token }: { token: string }) {
  const [errors, setErrors] = useState<NewPasswordErrors & { form?: string }>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const fieldErrors = validateNewPassword(password, String(formData.get("confirmation") ?? ""));
    setErrors(fieldErrors);
    if (fieldErrors.password || fieldErrors.confirmation) {
      return;
    }

    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);

    if (error) {
      setErrors({ form: authErrorMessage(error, "No pudimos guardar la contraseña. Intenta de nuevo.") });
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p role="status">Listo. Tu contraseña quedó guardada.</p>
        <Button asChild>
          <Link href={adminPath("/login")}>Ingresar al panel</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="password"
        label="Nueva contraseña"
        hint={`Mínimo ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`}
        error={errors.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? formFieldErrorId("password") : undefined}
        />
      </FormField>
      <FormField id="confirmation" label="Repite la contraseña" error={errors.confirmation ?? errors.form}>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errors.confirmation ? true : undefined}
          aria-describedby={errors.confirmation || errors.form ? formFieldErrorId("confirmation") : undefined}
        />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}

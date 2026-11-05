"use client";

import { adminPath } from "@/lib/site-urls";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_LINK_PATH } from "../password-policy";
import { authErrorMessage } from "../auth-errors";

export function RecoverPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const { error: requestError } = await authClient.requestPasswordReset({
      email: String(formData.get("email") ?? ""),
      redirectTo: PASSWORD_LINK_PATH,
    });

    setPending(false);
    if (requestError) {
      setError(authErrorMessage(requestError, "No pudimos enviar el correo. Intenta de nuevo en unos minutos."));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p role="status">
          Si el correo tiene acceso al panel, te enviamos un enlace para elegir una nueva contraseña. Revisa también
          la carpeta de spam.
        </p>
        <Link href={adminPath("/login")} className="text-sm text-muted-foreground underline underline-offset-4">
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="email" label="Correo" error={error}>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar enlace"}
      </Button>
      <Link href={adminPath("/login")} className="self-center text-sm text-muted-foreground underline underline-offset-4">
        Volver a ingresar
      </Link>
    </form>
  );
}

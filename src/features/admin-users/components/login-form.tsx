"use client";

import { adminPath } from "@/lib/site-urls";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField, formFieldErrorId } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "../auth-errors";

type LoginFormProps = {
  googleEnabled: boolean;
  oauthErrorCode?: string;
};

export function LoginForm({ googleEnabled, oauthErrorCode }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    oauthErrorCode ? authErrorMessage({ code: oauthErrorCode }, "No pudimos ingresar con Google. Intenta de nuevo.") : null,
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const { error: signInError } = await authClient.signIn.email({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (signInError) {
      setPending(false);
      setError(authErrorMessage(signInError, "Correo o contraseña incorrectos."));
      return;
    }

    router.replace(adminPath("/"));
    router.refresh();
  }

  async function handleGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: adminPath("/"), errorCallbackURL: adminPath("/login") });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField id="email" label="Correo">
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </FormField>
        <FormField id="password" label="Contraseña" error={error}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formFieldErrorId("password") : undefined}
          />
        </FormField>
        <Button type="submit" disabled={pending}>
          {pending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <Link href={adminPath("/recuperar")} className="self-center text-sm text-muted-foreground underline underline-offset-4">
        ¿Olvidaste tu contraseña?
      </Link>
      {googleEnabled ? (
        <Button type="button" variant="outline" onClick={handleGoogle}>
          Continuar con Google
        </Button>
      ) : null}
    </div>
  );
}

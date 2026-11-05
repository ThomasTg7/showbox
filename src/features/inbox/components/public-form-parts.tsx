"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { siteFieldErrorId } from "@/components/site/site-field";
import { Button } from "@/components/ui-gc/button";

/**
 * Campo trampa: está fuera de la pantalla y fuera del orden de tabulación. Una persona no lo ve; un bot que llena todos los
 * campos lo llena y el servidor descarta el envío.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="website">No completes este campo</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

/** Casilla obligatoria de la política de privacidad, con su enlace. */
export function ConsentField({ error, checked }: { error?: string; checked: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="consent" className="flex min-h-11 cursor-pointer items-start gap-3 text-base text-white/90">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          defaultChecked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? siteFieldErrorId("consent") : undefined}
          className="mt-1 size-5 shrink-0 accent-[#E3101F]"
        />
        <span>
          Acepto la{" "}
          <Link href="/privacidad" target="_blank" className="text-accent-bright underline underline-offset-4 hover:text-accent-bright-hover">
            política de privacidad
          </Link>
        </span>
      </label>
      {error ? (
        <p id={siteFieldErrorId("consent")} role="alert" className="text-sm font-medium text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Botón de enviar: se bloquea mientras se envía (con JavaScript; sin él, el navegador envía el formulario normal). */
export function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Enviando…" : children}
    </Button>
  );
}

/** Error general del envío (límite por hora, falla del servidor), arriba del botón. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border border-red-400/60 bg-red-400/10 px-4 py-3 text-base font-medium text-red-300">
      {message}
    </p>
  );
}

/** Lo que se ve después de enviar: reemplaza al formulario. */
export function SentNotice({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" className="flex flex-col items-start gap-4 border border-brand bg-surface p-8">
      <p className="font-display text-[clamp(32px,5vw,52px)] uppercase leading-[.95] text-white">{title}</p>
      <p className="max-w-prose text-lg text-white/90">{text}</p>
      <Button variant="ghost" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}

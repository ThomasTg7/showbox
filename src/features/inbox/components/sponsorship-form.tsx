"use client";
import { BRAND } from "@/domain/brand";

import { useActionState } from "react";
import { SITE_INPUT_CLASS, SiteField, siteFieldProps } from "@/components/site/site-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitSponsorshipAction, type PublicFormState } from "../actions";
import { ConsentField, FormError, HoneypotField, SentNotice, SubmitButton } from "./public-form-parts";

const NO_ERRORS: Record<string, string> = {};

/** Contacto de patrocinio: un `<form action>` con una server action (funciona sin JavaScript), igual que «Quiero pelear». */
export function SponsorshipForm() {
  const [state, formAction] = useActionState<PublicFormState, FormData>(submitSponsorshipAction, {});
  const errors = state.errors ?? NO_ERRORS;
  const values = state.values ?? {};

  if (state.ok) {
    return <SentNotice title="¡Gracias por escribirnos!" text={`Recibimos tu mensaje. Te contactaremos pronto para conversar cómo tu marca puede ser parte de ${BRAND.name}.`} />;
  }

  return (
    <form action={formAction} noValidate className="relative flex flex-col gap-6">
      <HoneypotField />
      <div className="grid gap-6 sm:grid-cols-2">
        <SiteField id="company" label="Empresa o marca" error={errors.company}>
          <Input {...siteFieldProps("company", errors.company)} name="company" defaultValue={values.company} autoComplete="organization" required className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="contactName" label="Persona de contacto" error={errors.contactName}>
          <Input {...siteFieldProps("contactName", errors.contactName)} name="contactName" defaultValue={values.contactName} autoComplete="name" required className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="email" label="Correo" error={errors.email}>
          <Input {...siteFieldProps("email", errors.email)} name="email" type="email" defaultValue={values.email} autoComplete="email" autoCapitalize="none" required className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="phone" label="Teléfono" optional error={errors.phone}>
          <Input {...siteFieldProps("phone", errors.phone)} name="phone" type="tel" defaultValue={values.phone} autoComplete="tel" placeholder="+593 99 123 4567" className={SITE_INPUT_CLASS} />
        </SiteField>
      </div>
      <SiteField id="message" label="¿Qué tienes en mente?" optional error={errors.message}>
        <Textarea {...siteFieldProps("message", errors.message)} name="message" defaultValue={values.message} rows={6} maxLength={2000} className={`${SITE_INPUT_CLASS} h-auto min-h-36 py-3`} />
      </SiteField>
      <ConsentField error={errors.consent} checked={values.consent === "on"} />
      <FormError message={errors.form} />
      <div>
        <SubmitButton>Enviar mensaje</SubmitButton>
      </div>
    </form>
  );
}

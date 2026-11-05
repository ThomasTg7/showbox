"use client";

import { useActionState } from "react";
import { SITE_INPUT_CLASS, SiteField, siteFieldProps } from "@/components/site/site-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitFighterApplicationAction, type PublicFormState } from "../actions";
import { MAX_VIDEO_LINKS } from "../schema";
import { ConsentField, FormError, HoneypotField, SentNotice, SubmitButton } from "./public-form-parts";

const NO_ERRORS: Record<string, string> = {};

/**
 * Postulación «Quiero pelear». Un `<form action>` con una server action: se envía también sin JavaScript. Con JavaScript los
 * errores salen junto a cada campo; lo escrito no se pierde (el servidor lo devuelve) y al terminar se ve el aviso de enviado.
 */
export function FighterApplicationForm() {
  const [state, formAction] = useActionState<PublicFormState, FormData>(submitFighterApplicationAction, {});
  const errors = state.errors ?? NO_ERRORS;
  const values = state.values ?? {};

  if (state.ok) {
    return <SentNotice title="¡Recibimos tu postulación!" text="Revisamos cada postulación con calma. Si tu perfil encaja con una próxima velada, te escribiremos al correo o al teléfono que dejaste." />;
  }

  return (
    <form action={formAction} noValidate className="relative flex flex-col gap-6">
      <HoneypotField />
      <div className="grid gap-6 sm:grid-cols-2">
        <SiteField id="name" label="Nombre completo" error={errors.name}>
          <Input {...siteFieldProps("name", errors.name)} name="name" defaultValue={values.name} autoComplete="name" required className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="email" label="Correo" error={errors.email}>
          <Input {...siteFieldProps("email", errors.email)} name="email" type="email" defaultValue={values.email} autoComplete="email" autoCapitalize="none" required className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="phone" label="Teléfono" optional error={errors.phone} hint="Con WhatsApp, si tienes.">
          <Input {...siteFieldProps("phone", errors.phone)} name="phone" type="tel" defaultValue={values.phone} autoComplete="tel" placeholder="+593 99 123 4567" className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="birthDate" label="Fecha de nacimiento" error={errors.birthDate}>
          <Input {...siteFieldProps("birthDate", errors.birthDate)} name="birthDate" type="date" defaultValue={values.birthDate} autoComplete="bday" required className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="weightKg" label="Peso (kg)" error={errors.weightKg}>
          <Input {...siteFieldProps("weightKg", errors.weightKg)} name="weightKg" inputMode="decimal" defaultValue={values.weightKg} placeholder="70,5" required className={SITE_INPUT_CLASS} />
        </SiteField>
        <SiteField id="record" label="Récord" optional error={errors.record} hint="Victorias-derrotas-empates, por ejemplo 5-1-0.">
          <Input {...siteFieldProps("record", errors.record)} name="record" defaultValue={values.record} placeholder="5-1-0" maxLength={60} className={SITE_INPUT_CLASS} />
        </SiteField>
      </div>
      <SiteField id="gym" label="Gimnasio" optional error={errors.gym}>
        <Input {...siteFieldProps("gym", errors.gym)} name="gym" defaultValue={values.gym} maxLength={100} className={SITE_INPUT_CLASS} />
      </SiteField>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-cond text-sm font-bold uppercase tracking-[.1em] text-white">
          Videos de tus peleas o entrenamientos <span className="ml-2 font-medium normal-case tracking-normal text-muted-foreground">(opcional, hasta {MAX_VIDEO_LINKS})</span>
        </legend>
        {Array.from({ length: MAX_VIDEO_LINKS }, (_, index) => (
          <Input key={index} name="videoLinks" type="url" aria-label={`Enlace de video ${index + 1}`} defaultValue={state.videoLinks?.[index]} placeholder="https://youtube.com/…" autoCapitalize="none" className={SITE_INPUT_CLASS} />
        ))}
        {errors.videoLinks ? (
          <p role="alert" className="text-sm font-medium text-red-400">
            {errors.videoLinks}
          </p>
        ) : null}
      </fieldset>
      <SiteField id="message" label="Cuéntanos de ti" optional error={errors.message}>
        <Textarea {...siteFieldProps("message", errors.message)} name="message" defaultValue={values.message} rows={5} maxLength={1000} className={`${SITE_INPUT_CLASS} h-auto min-h-32 py-3`} />
      </SiteField>
      <ConsentField error={errors.consent} checked={values.consent === "on"} />
      <FormError message={errors.form} />
      <div>
        <SubmitButton>Enviar postulación</SubmitButton>
      </div>
    </form>
  );
}

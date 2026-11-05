"use client";

import { FormField } from "@/components/admin/form-field";
import { TextField } from "@/components/admin/form-fields";
import { MediaField } from "@/features/media/components/media-field";
import type { MediaDTO } from "@/features/media/dto";
import type { SettingKey, SettingsMap } from "../registry";
import { FaqField } from "./faq-field";
import { PageTextField } from "./page-text-field";
import { SettingForm } from "./setting-form";

type SettingPanelProps = {
  settingKey: SettingKey;
  settings: SettingsMap;
  /** Imagen para compartir ya guardada (la lee la página con `getMedia`). */
  ogMedia: MediaDTO | null;
  /** «5 de octubre de 2026» (formateado en el servidor: la hora de Ecuador no se calcula en el navegador). */
  privacyUpdatedLabel: string | null;
};

const TEXT_HINT = "Se muestra en la página pública. Sin fotos ni videos: solo texto, títulos, listas y enlaces.";

/** El formulario de una pestaña de Configuración (una por clave del registro). */
export function SettingPanel({ settingKey, settings, ogMedia, privacyUpdatedLabel }: SettingPanelProps) {
  switch (settingKey) {
    case "about":
      return (
        <SettingForm settingKey="about" values={{}}>
          {(errors) => <PageTextField id="setting-about-body" label="Texto de Nosotros" initial={settings.about.body} error={errors.body} hint={TEXT_HINT} />}
        </SettingForm>
      );
    case "contact":
      return (
        <SettingForm settingKey="contact" values={settings.contact}>
          {() => (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="email" label="Correo de contacto" type="email" autoCapitalize="none" hint="Es el que ve el público en la página Contacto." />
              <TextField name="phone" label="Teléfono" type="tel" placeholder="+593 2 123 4567" />
              <TextField name="whatsapp" label="WhatsApp" type="tel" placeholder="+593 99 123 4567" hint="Con el código de país. Aparece un botón «Escríbenos por WhatsApp»." />
              <TextField name="address" label="Dirección" />
              <div className="md:col-span-2">
                <TextField
                  name="notifyEmail"
                  label="Correo para avisos"
                  type="email"
                  autoCapitalize="none"
                  hint="Aquí llega un aviso cada vez que alguien envía «Quiero pelear» o «Patrocinar»."
                  help="Es privado: el público no lo ve. Si lo dejas vacío, los mensajes igual llegan a la Bandeja del panel, pero no recibes el correo."
                />
              </div>
            </div>
          )}
        </SettingForm>
      );
    case "socials":
      return (
        <SettingForm settingKey="socials" values={settings.socials}>
          {() => (
            <div className="grid gap-4 md:grid-cols-2">
              <p className="max-w-prose text-muted-foreground md:col-span-2">Escribe el usuario (@usuario) o pega el enlace del perfil. Deja vacío lo que no tengan: no aparece en el sitio.</p>
              <TextField name="instagram" label="Instagram" placeholder="@showboxpromotions" autoCapitalize="none" />
              <TextField name="tiktok" label="TikTok" placeholder="@showboxpromotions" autoCapitalize="none" />
              <TextField name="youtube" label="YouTube" placeholder="Enlace del canal" autoCapitalize="none" />
              <TextField name="facebook" label="Facebook" placeholder="Enlace de la página" autoCapitalize="none" />
              <TextField name="x" label="X (Twitter)" placeholder="@showboxpromotions" autoCapitalize="none" />
            </div>
          )}
        </SettingForm>
      );
    case "ticketsFaq":
      return (
        <SettingForm settingKey="ticketsFaq" values={{}}>
          {(errors) => (
            <div className="flex flex-col gap-3">
              <p className="max-w-prose text-muted-foreground">Preguntas frecuentes que se muestran al final de Entradas. Si no hay ninguna, esa sección no aparece.</p>
              <FaqField initial={settings.ticketsFaq.items} error={errors.items} />
            </div>
          )}
        </SettingForm>
      );
    case "privacy":
      return (
        <SettingForm settingKey="privacy" values={{}}>
          {(errors) => (
            <PageTextField
              id="setting-privacy-body"
              label="Política de privacidad"
              initial={settings.privacy.body}
              error={errors.body}
              hint={privacyUpdatedLabel ? `Última actualización del texto: ${privacyUpdatedLabel}. La fecha se actualiza sola cuando cambias el texto. ${TEXT_HINT}` : TEXT_HINT}
            />
          )}
        </SettingForm>
      );
    case "footer":
      return (
        <SettingForm settingKey="footer" values={settings.footer}>
          {() => <TextField name="tagline" label="Frase del pie de página" maxLength={140} hint="Una línea corta bajo el logo. Déjala vacía si no quieres frase." />}
        </SettingForm>
      );
    case "share":
      return (
        <SettingForm settingKey="share" values={{}}>
          {(errors) => (
            <FormField
              id="setting-share-ogMediaId"
              label="Imagen al compartir el sitio"
              error={errors.ogMediaId}
              hint="Es la imagen que aparece cuando alguien comparte el sitio por WhatsApp, Instagram o redes."
            >
              <MediaField kind="og_image" name="ogMediaId" media={ogMedia} />
            </FormField>
          )}
        </SettingForm>
      );
    case "seo":
      return (
        <SettingForm settingKey="seo" values={settings.seo}>
          {() => (
            <TextField
              name="googleVerification"
              label="Código de verificación de Google"
              autoCapitalize="none"
              hint="Para Google Search Console. Puedes pegar la etiqueta completa o solo el código."
              help="En Search Console elige «Etiqueta HTML» y copia lo que te muestra (empieza con <meta name=&quot;google-site-verification&quot;…). Aquí pegas esa etiqueta o solo el valor de «content»."
            />
          )}
        </SettingForm>
      );
  }
}

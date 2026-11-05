import { telUrl, whatsappUrl } from "@/domain/phone";
import type { SettingValue } from "./registry";
import { socialLinks, type SocialLink } from "./social-links";

export type ContactDetails = { whatsapp: string | null; phone: string | null; networks: SocialLink[]; hasDetails: boolean };

/**
 * Lo que `/contacto` puede mostrar hoy. Sin nada que mostrar la página es un «Pronto…» y no se indexa. El correo de avisos
 * (`notifyEmail`) es de la bandeja: no es un dato público.
 */
export function contactDetails(contact: SettingValue<"contact">, socials: SettingValue<"socials">): ContactDetails {
  const whatsapp = whatsappUrl(contact.whatsapp);
  const phone = telUrl(contact.phone);
  const networks = socialLinks(socials);
  return { whatsapp, phone, networks, hasDetails: Boolean(contact.email || phone || whatsapp || contact.address || networks.length > 0) };
}

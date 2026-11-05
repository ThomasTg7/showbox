import { socialUrl, type SiteSocialNetwork } from "@/domain/socials";
import type { SettingValue } from "./registry";

const NETWORKS: { network: SiteSocialNetwork; label: string }[] = [
  { network: "instagram", label: "Instagram" },
  { network: "tiktok", label: "TikTok" },
  { network: "youtube", label: "YouTube" },
  { network: "facebook", label: "Facebook" },
  { network: "x", label: "X" },
];

export type SocialLink = { network: SiteSocialNetwork; label: string; href: string };

/** Los perfiles de la promotora que tienen enlace usable, en orden fijo. Lo que está vacío o no es un enlace no se muestra. */
export function socialLinks(socials: SettingValue<"socials">): SocialLink[] {
  return NETWORKS.flatMap(({ network, label }) => {
    const href = socialUrl(network, socials[network]);
    return href ? [{ network, label, href }] : [];
  });
}

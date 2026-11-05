export type SocialNetwork = "instagram" | "tiktok" | "youtube" | "x";
/** Las redes de la promotora (Configuración) suman Facebook a las de un boxeador. */
export type SiteSocialNetwork = SocialNetwork | "facebook";

const PROFILE_URL: Record<SiteSocialNetwork, (handle: string) => string> = {
  instagram: (handle) => `https://www.instagram.com/${handle}`,
  tiktok: (handle) => `https://www.tiktok.com/@${handle}`,
  youtube: (handle) => `https://www.youtube.com/@${handle}`,
  x: (handle) => `https://x.com/${handle}`,
  facebook: (handle) => `https://www.facebook.com/${handle}`,
};

const HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,50}$/;

/**
 * Enlace al perfil desde lo que escribe el admin: un usuario ("@usuario" o "usuario") o un enlace completo.
 * Solo devuelve http(s): lo demás (javascript:, data:, texto libre) es `null` y no se muestra.
 */
export function socialUrl(network: SiteSocialNetwork, value: string): string | null {
  const text = value.trim();
  if (!text) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) {
    try {
      const url = new URL(text);
      return url.protocol === "https:" || url.protocol === "http:" ? text : null;
    } catch {
      return null;
    }
  }

  const handle = text.replace(/^@/, "");
  return HANDLE_PATTERN.test(handle) ? PROFILE_URL[network](handle) : null;
}

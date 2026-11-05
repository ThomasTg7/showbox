import { isVerticalEmbed, type Embed, type EmbedProvider } from "@/domain/embed";

// Lo comparten la fachada del sitio (`render/embed-facade.tsx`) y la vista del editor (`editor/extensions.ts`): el panel
// muestra el mismo reproductor, con las mismas restricciones, que verá el público tras el clic.

export const EMBED_PROVIDER_NAME: Record<EmbedProvider, string> = { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", facebook: "Facebook" };

/** Columna angosta de cada red para las publicaciones verticales (Instagram, TikTok, un post de Facebook). */
const COLUMN_CLASS: Record<EmbedProvider, string> = {
  youtube: "mx-auto h-[640px] w-full max-w-[540px]",
  instagram: "mx-auto h-[640px] w-full max-w-[540px]",
  tiktok: "mx-auto h-[740px] w-full max-w-[340px]",
  facebook: "mx-auto h-[640px] w-full max-w-[500px]",
};

/** Alto y ancho del reproductor: un video (YouTube, video de Facebook) es horizontal; el resto, una columna vertical. */
export function embedFrameClass(embed: Embed): string {
  return isVerticalEmbed(embed) ? COLUMN_CLASS[embed.provider] : "aspect-video w-full";
}

/** Atributos del `iframe`: sin navegar la página de arriba, sin pasar la dirección completa y con lo justo para reproducir. */
export const EMBED_FRAME_ATTRIBUTES = {
  allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
  referrerPolicy: "strict-origin-when-cross-origin",
  sandbox: "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation",
} as const;

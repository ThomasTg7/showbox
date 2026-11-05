export const EMBED_PROVIDERS = ["instagram", "youtube", "tiktok", "facebook"] as const;
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];
export type Embed = { provider: EmbedProvider; id: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_ID = /^[A-Za-z0-9_-]{5,40}$/;
const TIKTOK_ID = /^\d{8,25}$/;
const FACEBOOK_PAGE = /^[A-Za-z0-9.]{1,80}$/;
const FACEBOOK_POST_ID = /^[A-Za-z0-9_-]{1,120}$/;
const FACEBOOK_VIDEO_ID = /^\d{5,25}$/;
const FACEBOOK_SHARE_CODE = /^[A-Za-z0-9_-]{5,40}$/;
/** Primeras partes de una dirección de Facebook que no son una página (`/<página>/posts/<id>`). */
const FACEBOOK_RESERVED = new Set(["groups", "plugins", "share", "watch", "reel", "events", "photo", "story.php", "permalink.php"]);

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]);
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"]);

/** Acepta un enlace sin esquema («youtu.be/…»); cualquier otro esquema que no sea http(s) se descarta. */
function toUrl(raw: string): URL | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Un enlace con usuario («https://usuario@…») es una forma típica de disfrazar otro sitio.
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function segmentsOf(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function parseInstagram(url: URL): Embed | null {
  const segments = segmentsOf(url);
  // `/p/<id>`, `/reel/<id>`, `/reels/<id>`, `/tv/<id>` y la misma forma precedida por la cuenta (`/<cuenta>/p/<id>`).
  const index = segments.findIndex((segment) => ["p", "reel", "reels", "tv"].includes(segment));
  const id = index >= 0 && index <= 1 ? segments[index + 1] : undefined;
  return id && INSTAGRAM_ID.test(id) ? { provider: "instagram", id } : null;
}

function parseYouTube(url: URL): Embed | null {
  const segments = segmentsOf(url);
  let id: string | null | undefined;
  if (url.hostname === "youtu.be") id = segments[0];
  else if (segments[0] === "watch") id = url.searchParams.get("v");
  else if (["shorts", "embed", "live", "v"].includes(segments[0] ?? "")) id = segments[1];
  return id && YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
}

function parseTikTok(url: URL): Embed | null {
  const segments = segmentsOf(url);
  const id = segments[0]?.startsWith("@") && segments[1] === "video" ? segments[2] : undefined;
  return id && TIKTOK_ID.test(id) ? { provider: "tiktok", id } : null;
}

/**
 * Facebook no tiene un id único para todo: el «id» guardado es la ruta de la publicación (`<página>/posts/<id>`,
 * `<página>/videos/<id>`, `watch/<id>`, `reel/<id>` o `share/<p|v|r>/<código>`), siempre validada parte por parte.
 */
function parseFacebook(url: URL): Embed | null {
  const segments = segmentsOf(url);
  const [first, second, third] = segments;
  let id: string | null = null;
  if (first === "watch") {
    const video = url.searchParams.get("v");
    id = video && FACEBOOK_VIDEO_ID.test(video) ? `watch/${video}` : null;
  } else if (first === "reel") {
    id = third === undefined && second && FACEBOOK_VIDEO_ID.test(second) ? `reel/${second}` : null;
  } else if (first === "share") {
    id = ["p", "v", "r"].includes(second ?? "") && third && FACEBOOK_SHARE_CODE.test(third) && segments.length === 3 ? `share/${second}/${third}` : null;
  } else if (first && FACEBOOK_PAGE.test(first) && !FACEBOOK_RESERVED.has(first)) {
    // `/<página>/videos/<título>/<id>` también existe: el id del video es la última parte.
    const video = segments.at(-1);
    if (second === "posts" && third && FACEBOOK_POST_ID.test(third) && segments.length === 3) id = `${first}/posts/${third}`;
    else if (second === "videos" && video && FACEBOOK_VIDEO_ID.test(video) && segments.length <= 4) id = `${first}/videos/${video}`;
  }
  return id ? { provider: "facebook", id } : null;
}

const isFacebookVideo = (id: string) => /^(watch|reel)\//.test(id) || /^share\/[vr]\//.test(id) || id.includes("/videos/");

/** Las publicaciones que se ven en una columna angosta (no un video horizontal). */
export function isVerticalEmbed(embed: Embed): boolean {
  if (embed.provider === "youtube") return false;
  if (embed.provider === "facebook") return !isFacebookVideo(embed.id);
  return true;
}

/** Imagen fija del video en el servidor de imágenes de YouTube (no deja cookies): la «portada» antes de reproducir. */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Reconoce un enlace de Instagram, YouTube, TikTok o Facebook y devuelve solo la red y el id; cualquier otro enlace es `null`. */
export function parseEmbedUrl(url: string): Embed | null {
  const parsed = toUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();
  if (INSTAGRAM_HOSTS.has(host)) return parseInstagram(parsed);
  if (YOUTUBE_HOSTS.has(host) || host === "youtu.be") return parseYouTube(parsed);
  if (TIKTOK_HOSTS.has(host)) return parseTikTok(parsed);
  if (FACEBOOK_HOSTS.has(host)) return parseFacebook(parsed);
  return null;
}

/** Dirección del `iframe` de cada red (YouTube sin cookies de seguimiento). `autoplay`: tras tocar «play» en el sitio. */
export function embedSrc(embed: Embed, { autoplay = false } = {}): string {
  switch (embed.provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${embed.id}${autoplay ? "?autoplay=1" : ""}`;
    case "facebook": {
      const href = encodeURIComponent(embedCanonicalUrl(embed));
      return isFacebookVideo(embed.id)
        ? `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false`
        : `https://www.facebook.com/plugins/post.php?href=${href}&show_text=true`;
    }
    case "instagram":
      return `https://www.instagram.com/p/${embed.id}/embed`;
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${embed.id}`;
  }
}

/** Enlace público de la publicación (para «Ver en Instagram» y para quien no carga el reproductor). */
export function embedCanonicalUrl(embed: Embed): string {
  switch (embed.provider) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${embed.id}`;
    case "instagram":
      return `https://www.instagram.com/p/${embed.id}/`;
    case "tiktok":
      // TikTok redirige `@/video/<id>` al video con su cuenta real; el id basta.
      return `https://www.tiktok.com/@/video/${embed.id}`;
    case "facebook":
      return embed.id.startsWith("watch/") ? `https://www.facebook.com/watch/?v=${embed.id.slice("watch/".length)}` : `https://www.facebook.com/${embed.id}`;
  }
}

/**
 * Lee los atributos de un nodo `embed` guardado (`{ provider, id }`). Solo vale si el id sobrevive al ida y vuelta por el
 * enlace público de su red: así no puede traer nada más que el id (ni una ruta, ni otro sitio).
 */
export function embedFromAttrs(attrs: unknown): Embed | null {
  if (typeof attrs !== "object" || attrs === null) return null;
  const { provider, id } = attrs as Record<string, unknown>;
  if (typeof provider !== "string" || typeof id !== "string" || !(EMBED_PROVIDERS as readonly string[]).includes(provider)) return null;
  const embed = { provider, id } as Embed;
  const parsed = parseEmbedUrl(embedCanonicalUrl(embed));
  return parsed && parsed.provider === embed.provider && parsed.id === embed.id ? embed : null;
}

// Enlaces de Google Maps: de qué sitios se aceptan y cómo se saca el lugar de ellos. Sin red: resolver un enlace corto
// (que solo trae un código) es de `features/events/location.ts`.

const MAPS_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "google.cl", "www.google.cl", "maps.app.goo.gl", "goo.gl"]);
const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

function parseUrl(link: string): URL | null {
  try {
    return new URL(link.trim());
  } catch {
    return null;
  }
}

/** Un enlace https de Google Maps (también los cortos de «Compartir»). El resto de Google y cualquier otro sitio, no. */
export function isGoogleMapsLink(link: string): boolean {
  const url = parseUrl(link);
  if (!url || url.protocol !== "https:" || !MAPS_HOSTS.has(url.hostname)) return false;
  if (url.hostname === "goo.gl") return url.pathname.startsWith("/maps");
  if (SHORT_HOSTS.has(url.hostname)) return true;
  // Los demás dominios de Google solo valen si son Maps (`/maps…`) o el subdominio `maps.`.
  return url.hostname.startsWith("maps.") || url.pathname.startsWith("/maps");
}

/** Un enlace corto de «Compartir»: no trae el lugar, hay que seguir su redirección. */
export function isShortMapsLink(link: string): boolean {
  const url = parseUrl(link);
  return url !== null && SHORT_HOSTS.has(url.hostname);
}

type Coordinates = { lat: number; lng: number };

const NUMBER = "-?\\d{1,3}(?:\\.\\d+)?";
const PAIR = new RegExp(`^(${NUMBER}),\\s*(${NUMBER})$`);
const PIN = new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`);
const VIEWPORT = new RegExp(`@(${NUMBER}),(${NUMBER})`);
const COORDINATE_PARAMS = ["q", "query", "ll", "destination", "center"];

function toCoordinates(lat: string | undefined, lng: string | undefined): Coordinates | null {
  if (lat === undefined || lng === undefined) return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 ? point : null;
}

/**
 * El punto de un enlace de Google Maps: el pin del lugar (`!3d…!4d…`) manda sobre la vista del mapa (`@lat,lng`), y
 * después vienen los parámetros `q`, `query`, `ll`… y la página de consentimiento (`continue=`). `null` si no hay punto.
 */
export function parseMapsCoordinates(link: string): Coordinates | null {
  const url = parseUrl(link);
  if (!url) return null;
  const path = decodeURIComponent(url.pathname + url.hash);

  const pin = PIN.exec(path + decodeURIComponent(url.search));
  if (pin) return toCoordinates(pin[1], pin[2]);
  const viewport = VIEWPORT.exec(path);
  if (viewport) return toCoordinates(viewport[1], viewport[2]);

  for (const name of COORDINATE_PARAMS) {
    const pair = PAIR.exec(url.searchParams.get(name) ?? "");
    if (pair) return toCoordinates(pair[1], pair[2]);
  }
  const lastSegment = PAIR.exec(path.split("/").filter(Boolean).at(-1) ?? "");
  if (lastSegment) return toCoordinates(lastSegment[1], lastSegment[2]);

  const next = url.searchParams.get("continue");
  return next ? parseMapsCoordinates(next) : null;
}

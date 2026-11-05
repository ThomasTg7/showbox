import { isGoogleMapsLink, isShortMapsLink, parseMapsCoordinates } from "@/domain/maps-link";
import { UserFacingError } from "@/lib/user-facing-error";

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 5000;

/**
 * El lugar al que apunta un enlace de Google Maps. Uno largo ya lo trae; uno corto («Compartir» → `maps.app.goo.gl`)
 * solo trae un código y se sigue su redirección, a mano y solo hacia Google: así el servidor no hace pedidos a un
 * sitio que alguien escriba en el formulario. `null` si no es de Google Maps o no se puede leer el lugar.
 */
export async function locationFromMapsLink(link: string, fetchImpl: typeof fetch = fetch): Promise<{ lat: number; lng: number } | null> {
  if (!isGoogleMapsLink(link)) return null;

  let current = link.trim();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const found = parseMapsCoordinates(current);
    if (found) return found;
    if (!isShortMapsLink(current) && !isGoogleMapsLink(current) && !new URL(current).hostname.endsWith(".google.com")) return null;

    let response: Response;
    try {
      response = await fetchImpl(current, { redirect: "manual", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch {
      return null;
    }
    const next = response.headers.get("location");
    if (!next) return null;
    try {
      current = new URL(next, current).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/** Los datos del evento con `lat` y `lng` sacados del enlace de Google Maps, si hay uno (sin enlace quedan como vinieron). */
export async function withMapsLocation<T extends { mapsUrl: string | null; lat: number | null; lng: number | null }>(data: T): Promise<T> {
  if (!data.mapsUrl) return data;
  const found = await locationFromMapsLink(data.mapsUrl);
  if (!found) throw new UserFacingError("No pudimos leer la ubicación de ese enlace. En Google Maps toca «Compartir» y copia el enlace completo.");
  return { ...data, lat: found.lat, lng: found.lng };
}

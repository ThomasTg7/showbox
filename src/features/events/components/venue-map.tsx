import { MapPin } from "lucide-react";
import { mapEmbedUrl, mapLinkUrl } from "../public-format";

type VenueMapProps = { name: string; address: string; city: string; lat: number | null; lng: number | null };

/** El recinto con su mapa de Google Maps (inserción por coordenadas, sin clave de API, cargada solo al acercarse). Sin coordenadas, solo la dirección. */
export function VenueMap({ name, address, city, lat, lng }: VenueMapProps) {
  const hasMap = lat !== null && lng !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-3">
          <MapPin aria-hidden className="mt-1 size-6 shrink-0 text-brand" />
          <span>
            <span className="block font-display text-[clamp(26px,4vw,40px)] uppercase leading-none text-white">{name}</span>
            <span className="mt-2 block font-cond text-base font-semibold uppercase tracking-[.06em] text-muted-foreground">
              {[address, city].filter(Boolean).join(" · ")}
            </span>
          </span>
        </p>
        {hasMap ? (
          <a
            href={mapLinkUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit border-b-2 border-brand font-cond text-sm font-extrabold uppercase tracking-[.1em] text-white hover:text-brand"
          >
            Cómo llegar
          </a>
        ) : null}
      </div>
      {hasMap ? (
        <iframe
          title={`Mapa de ${name}`}
          src={mapEmbedUrl(lat, lng)}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-[280px] w-full border border-border bg-surface grayscale sm:h-[340px]"
        />
      ) : null}
    </div>
  );
}

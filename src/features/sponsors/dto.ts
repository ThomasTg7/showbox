import type { SponsorTier } from "@/domain/sponsors";
import type { MediaDTO } from "@/features/media/dto";

// Todo lo que pasa por `unstable_cache` se serializa en JSON: sin `Date`.

/** Lo que dibujan la cinta, la grilla del evento y el footer. */
export type SponsorDTO = {
  id: string;
  name: string;
  url: string | null;
  tier: SponsorTier;
  logo: MediaDTO;
};

/** Una fila del panel: todos los datos del formulario, el logo y cómo está hoy su vigencia. */
export type AdminSponsorRow = {
  id: string;
  name: string;
  url: string | null;
  tier: SponsorTier;
  sortOrder: number;
  startsOn: string | null;
  endsOn: string | null;
  allEvents: boolean;
  active: boolean;
  logo: MediaDTO | null;
  validity: "current" | "upcoming" | "expired";
  events: { id: string; name: string }[];
};

/** Niveles de patrocinio, de mayor a menor: ese es también el orden en que se muestran. */
export const SPONSOR_TIERS = ["principal", "oficial", "colaborador"] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];

export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  principal: "Principal",
  oficial: "Oficial",
  colaborador: "Colaborador",
};

export type SponsorPlacement = "home" | "event" | "footer";

/** Qué niveles se muestran en cada ubicación (spec §4.9). */
export const PLACEMENT_TIERS: Record<SponsorPlacement, readonly SponsorTier[]> = {
  home: ["principal", "oficial"],
  event: SPONSOR_TIERS,
  footer: ["principal"],
};

type SponsorWindow = { startsOn: string | null; endsOn: string | null };

/**
 * Si un patrocinador está en su vigencia hoy. Las fechas son días de Ecuador (`YYYY-MM-DD`) y `today` también
 * (`toLocalInputs(now).date`): el último día vale hasta la medianoche de Ecuador, no hasta las 21:00 UTC. Un extremo
 * nulo está abierto. Texto ISO se compara bien como texto.
 */
export function isSponsorActive({ startsOn, endsOn }: SponsorWindow, today: string): boolean {
  return (startsOn === null || startsOn <= today) && (endsOn === null || today <= endsOn);
}

/** Para el panel: «Vigente», «Empieza pronto» o «Vencido». */
export function sponsorValidity({ startsOn, endsOn }: SponsorWindow, today: string): "current" | "upcoming" | "expired" {
  if (startsOn !== null && today < startsOn) return "upcoming";
  if (endsOn !== null && today > endsOn) return "expired";
  return "current";
}

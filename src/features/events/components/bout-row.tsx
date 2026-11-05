import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Flag } from "@/components/ui-gc/flag";
import type { BoutDTO, BoutFighterDTO } from "../dto";
import { boutHref } from "../bout-lookup";
import { boutBillingLabel, roundsLabel } from "../public-format";
import { BoutComparison } from "./bout-comparison";
import { BoutItem } from "./bout-accordion";
import { CornerFigure, CornerName, type Side } from "./bout-corner";

const WINNER_OF: Record<"red_win" | "blue_win", Side> = { red_win: "red", blue_win: "blue" };

/** Bandera y récord de una esquina: en la franja de abajo en celular, bajo el nombre en PC (el azul, espejado). */
function StripRecord({ fighter, side }: { fighter: BoutFighterDTO; side: Side }) {
  const { wins, losses, draws } = fighter.record;
  return (
    <span
      className={`flex items-center gap-1.5 self-center font-cond text-[13px] font-bold tracking-[.04em] text-neutral-700 sm:text-[15px] lg:self-start lg:pt-2 ${
        side === "red" ? "pl-3 [grid-area:rr] lg:pl-0" : "flex-row-reverse justify-self-end pr-3 [grid-area:br] lg:pr-0"
      }`}
    >
      <Flag code={fighter.nationality} />
      <span data-slot="bout-record">{`${wins}-${losses}-${draws}`}</span>
    </span>
  );
}

/**
 * Una pelea de la cartelera, en su propia tarjeta: las dos fotos a los lados (con la placa de campeón o el ranking arriba),
 * los nombres al centro en celular o junto a su foto en PC, y abajo la franja con la categoría (y si es por el título),
 * la bandera y el récord de cada uno. Los rounds, los apodos y la comparación se despliegan con «Ver datos».
 */
export function BoutRow({
  bout,
  eventSlug,
  rankLabels,
}: {
  bout: BoutDTO;
  /** Para el enlace a la página de la pelea. */
  eventSlug: string;
  /** `C` (campeón) o `#n` por id de boxeador (ranking de hoy). */
  rankLabels?: Record<string, string>;
}) {
  const { result } = bout;
  const winner = result && (result.outcome === "red_win" || result.outcome === "blue_win") ? WINNER_OF[result.outcome] : null;
  const cancelled = bout.status === "cancelled";
  const gender = bout.division?.gender ?? "male";
  const billing = boutBillingLabel(bout);

  const summary = (
    <div data-slot="bout-summary">
      {/* Celular: fotos a los lados, nombres al centro con «vs» y abajo la franja (récords y categoría).
          PC: cada nombre junto a su foto con el récord debajo, y al centro «VS» con la categoría debajo. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)_minmax(0,190px)] grid-rows-[1fr_auto_1fr_auto] gap-x-3 pt-3 [grid-template-areas:'rp_rn_bp'_'rp_vs_bp'_'rp_bn_bp'_'rr_bl_br'] lg:grid-cols-[148px_minmax(0,1fr)_auto_minmax(0,1fr)_148px] lg:grid-rows-[1fr_1fr] lg:gap-x-8 lg:px-6 lg:pt-5 lg:[grid-template-areas:'rp_rn_vs_bn_bp'_'rp_rr_bl_br_bp']">
        <div aria-hidden className="col-span-full row-start-4 border-t border-neutral-200 lg:hidden" />
        <div data-corner="red" className="contents">
          <CornerFigure fighter={bout.red} side="red" won={winner === "red"} rankLabel={rankLabels?.[bout.red.id]} gender={gender} />
          <CornerName fighter={bout.red} side="red" />
          <StripRecord fighter={bout.red} side="red" />
        </div>
        <span aria-hidden className="self-center py-1.5 text-center font-cond text-sm font-bold lowercase tracking-[.08em] text-neutral-500 [grid-area:vs] lg:self-end lg:py-0 lg:font-display lg:text-[40px] lg:font-normal lg:uppercase lg:leading-none lg:tracking-normal lg:text-black">
          vs
        </span>
        <span
          data-slot="bout-billing"
          className={`min-w-0 self-center text-balance py-2.5 text-center font-cond text-[11px] font-extrabold uppercase leading-tight tracking-[.12em] [grid-area:bl] sm:text-[13px] lg:max-w-[260px] lg:self-start lg:py-0 lg:pt-2 ${bout.isTitleFight ? "text-[#C8102E]" : "text-black"}`}
        >
          {billing}
        </span>
        <div data-corner="blue" className="contents">
          <CornerFigure fighter={bout.blue} side="blue" won={winner === "blue"} rankLabel={rankLabels?.[bout.blue.id]} gender={gender} />
          <CornerName fighter={bout.blue} side="blue" />
          <StripRecord fighter={bout.blue} side="blue" />
        </div>
      </div>

      {cancelled || result ? (
        <div className="flex flex-col items-center gap-1.5 border-t border-neutral-200 px-3 pt-3 text-center">
          {cancelled ? (
            <span className="font-cond text-xs font-extrabold uppercase tracking-[.12em] text-[#D7263D]">Cancelada{bout.cancelReason ? ` · ${bout.cancelReason}` : ""}</span>
          ) : null}
          {result && !winner ? (
            <span data-result="none" className="bg-neutral-800 px-2 py-0.5 font-cond text-[11px] font-extrabold uppercase tracking-[.12em] text-white">
              {result.outcome === "draw" ? "Empate" : "Sin resultado"}
            </span>
          ) : null}
          {result ? (
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-cond text-[15px] font-bold uppercase tracking-[.05em] text-black" data-result-line>
              <span>{result.line}</span>
              {result.videoUrl ? (
                <a href={result.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border-b-2 border-brand text-[13px] hover:text-neutral-600">
                  Ver la pelea <ExternalLink aria-hidden className="size-3.5" />
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <BoutItem
      boutId={bout.id}
      label={`${bout.red.lastName} vs ${bout.blue.lastName}`}
      className={`border border-neutral-200 bg-white pb-1 shadow-[0_2px_14px_rgba(0,0,0,.07)] ${cancelled ? "opacity-60" : ""}`}
      summary={summary}
      details={
        <div data-slot="bout-details" className="px-3 lg:px-6">
          <p className="mt-1 text-center font-cond text-xs font-extrabold uppercase tracking-[.14em] text-neutral-600">{roundsLabel(bout)}</p>
          <BoutComparison bout={bout} />
          {/* La pelea completa (resultado, árbitro, bonos y las tarjetas de los jueces round por round) tiene su página. */}
          <Link
            href={boutHref(eventSlug, bout.id)}
            className="sb-gradient-button mx-auto mb-3 flex min-h-11 w-fit items-center gap-2 px-5 font-cond text-xs font-extrabold uppercase tracking-[.14em] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <span>{result?.scorecards?.length ? "Ver la pelea y las tarjetas" : "Ver la pelea completa"}</span>
            <span className="sr-only">: {bout.red.lastName} vs {bout.blue.lastName}</span>
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      }
    />
  );
}

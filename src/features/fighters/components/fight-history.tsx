"use client";

import Link from "next/link";
import { useState } from "react";
import { BOUT_LEVEL_LABELS, type BoutLevel } from "@/domain/bout-enums";
import type { FightHistoryRow } from "@/features/events/dto";
import { formatDate } from "@/lib/format-date";
import { FighterFace } from "./fighter-photo";
import { SectionTitle } from "./section-title";

const RESULT_LABEL = { win: "Victoria", loss: "Derrota", draw: "Empate", no_contest: "Sin resultado" } as const;
const RESULT_CLASS = {
  win: "bg-brand text-white",
  loss: "bg-neutral-700 text-white",
  draw: "bg-neutral-800 text-neutral-200",
  no_contest: "bg-neutral-800 text-neutral-200",
} as const;

type Filter = "all" | BoutLevel;

/**
 * Historial de peleas en ShowBox: la más reciente primero, una fila por pelea (tarjeta apilada en celular). El
 * filtro Profesional / Amateur solo aparece si hay peleas de los dos niveles. Se cachea con el boxeador: las fechas
 * llegan como texto ISO.
 */
export function FightHistory({ rows }: { rows: FightHistoryRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  if (rows.length === 0) return null;

  const levels = new Set(rows.map((row) => row.level));
  const showFilter = levels.size > 1;
  const shown = filter === "all" ? rows : rows.filter((row) => row.level === filter);

  return (
    <section aria-labelledby="fighter-history-heading" className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] py-14 lg:py-20">
      <div className="mb-10 flex flex-col items-center gap-6 text-center">
        <SectionTitle id="fighter-history-heading">Historial de peleas</SectionTitle>
        {showFilter ? (
          <div role="group" aria-label="Filtrar por nivel" className="flex border border-border">
            {(["all", "pro", "amateur"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`min-h-11 px-4 font-cond text-sm font-extrabold uppercase tracking-[.1em] transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright ${
                  filter === option ? "bg-brand text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                {option === "all" ? "Todas" : BOUT_LEVEL_LABELS[option]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ul aria-label="Historial de peleas" className="mx-auto flex max-w-[1100px] flex-col">
        {shown.map((row) => {
          const opponentName = `${row.opponent.firstName} ${row.opponent.lastName}`;
          return (
            <li key={row.boutId} data-fight={row.boutId} data-level={row.level} data-result={row.fighterResult} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 border-b border-border py-4 sm:grid-cols-[auto_120px_1fr_1fr_auto] sm:gap-x-6">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-surface sm:h-[72px] sm:w-16">
                <FighterFace
                  fighter={row.opponent}
                  sizes="64px"
                  silhouetteClassName="absolute -bottom-1 left-1/2 h-[112%] -translate-x-1/2 text-black drop-shadow-[0_0_2px_rgba(255,59,71,.55)]"
                />
              </div>
              <span className={`w-fit justify-self-start px-2.5 py-1 font-cond text-[11px] font-extrabold uppercase tracking-[.12em] sm:justify-self-auto ${RESULT_CLASS[row.fighterResult]}`}>
                {RESULT_LABEL[row.fighterResult]}
              </span>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <p className="font-display text-[28px] uppercase leading-none text-white">
                  {row.opponent.isPublic ? (
                    <Link href={`/boxeadores/${row.opponent.slug}`} className="underline-offset-4 hover:underline focus-visible:underline">
                      {opponentName}
                    </Link>
                  ) : (
                    opponentName
                  )}
                </p>
                <p className="mt-1 font-cond text-sm font-semibold uppercase tracking-[.06em] text-muted-foreground">{BOUT_LEVEL_LABELS[row.level]}</p>
              </div>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <p className="font-cond text-base font-bold uppercase tracking-[.06em] text-white">
                  <Link href={`/eventos/${row.eventSlug}`} className="underline-offset-4 hover:underline focus-visible:underline">
                    {row.eventName}
                  </Link>
                </p>
                <p className="mt-1 font-cond text-sm font-semibold uppercase tracking-[.06em] text-muted-foreground">{formatDate(new Date(row.date))}</p>
              </div>
              <p className="col-span-2 font-cond text-base font-bold uppercase tracking-[.06em] text-white sm:col-span-1 sm:text-right">
                {row.methodText}
                {row.roundTime ? <span className="block text-sm font-semibold text-muted-foreground">{row.roundTime}</span> : null}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

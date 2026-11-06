"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { SectionHeading } from "@/components/ui-gc/section-heading";
import { cn } from "@/lib/cn";

type Level = "pro" | "amateur";

type RankingSwitchProps = {
  /** Cada nivel trae sus tarjetas ya armadas por el servidor; un nivel sin tarjetas es `null` y no tiene pestaña. */
  panels: { pro: ReactNode | null; amateur: ReactNode | null };
  /** «Actualizado 20 sep 2026» de cada nivel (el rótulo sobre el título). */
  kickers: { pro: string; amateur: string };
};

const LABELS: Record<Level, string> = { pro: "Pro", amateur: "Amateur" };

/**
 * «Rankings» de la home: el selector Pro/Amateur solo alterna cuál de los dos paneles (ya en la página) se ve: no pide
 * nada. Un nivel sin tarjetas no tiene pestaña; con uno solo no hay selector. Sin JavaScript queda el primero y el enlace
 * a `/rankings`.
 */
export function RankingSwitch({ panels, kickers }: RankingSwitchProps) {
  const uid = useId();
  const levels = (["pro", "amateur"] as const).filter((level) => panels[level] !== null);
  const [active, setActive] = useState<Level>(levels[0] ?? "pro");
  if (levels.length === 0) return null;

  return (
    <div>
      <SectionHeading
        reveal
        kicker={kickers[active]}
        title="Rankings"
        titleId="home-rankings-title"
        action={
          levels.length > 1 ? (
            <div role="tablist" aria-label="Nivel del ranking" className="inline-flex border-2 border-border">
              {levels.map((level) => (
                <button
                  key={level}
                  id={`${uid}-tab-${level}`}
                  role="tab"
                  type="button"
                  aria-selected={active === level}
                  aria-controls={`${uid}-panel-${level}`}
                  onClick={() => setActive(level)}
                  className={cn(
                    "min-h-11 px-5 font-cond text-sm font-extrabold uppercase tracking-[.1em] outline-none transition-opacity focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white",
                    active === level ? "bg-brand text-white" : "text-muted-foreground hover:text-white",
                  )}
                >
                  {LABELS[level]}
                </button>
              ))}
            </div>
          ) : null
        }
      />
      {levels.map((level) => (
        <div key={level} id={`${uid}-panel-${level}`} role={levels.length > 1 ? "tabpanel" : undefined} aria-labelledby={levels.length > 1 ? `${uid}-tab-${level}` : undefined} hidden={active !== level} data-level={level} className="grid gap-6 lg:grid-cols-3">
          {panels[level]}
        </div>
      ))}
      <p className="mt-8">
        <Link href={active === "amateur" ? "/rankings?nivel=amateur" : "/rankings"} className="inline-flex min-h-11 items-center gap-4 border-b-2 border-brand pb-1 font-cond text-sm font-extrabold uppercase tracking-[.1em] text-white">
          Ver todos los rankings <span aria-hidden>→</span>
        </Link>
      </p>
    </div>
  );
}

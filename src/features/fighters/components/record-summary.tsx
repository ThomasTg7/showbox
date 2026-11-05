import { BRAND } from "@/domain/brand";
import { formatClock } from "@/domain/clock";
import type { ComputedRecord } from "@/domain/record";
import type { ManualRecord } from "../dto";
import { SectionTitle } from "./section-title";

type Levels<T> = { pro: T; amateur: T };

type RecordSummaryProps = {
  /** Récord de toda la carrera, cargado a mano. */
  manual: Levels<ManualRecord>;
  /** Récord en la promotora, calculado desde las peleas (Plan 03). Sin peleas todavía es 0-0-0. */
  computed: Levels<ComputedRecord>;
};

const METHOD_LABELS = [
  { key: "koTko", label: "KO/TKO" },
  { key: "decision", label: "Decisión" },
  { key: "dq", label: "Descalif." },
] as const;

const STREAK_LABELS = { win: "victorias seguidas", loss: "derrotas seguidas", draw: "empates seguidos" } as const;

/** "12-2-0": victorias-derrotas-empates. Los sin resultado se cuentan aparte (`noContestsLabel`). */
export function formatRecord({ wins, losses, draws }: { wins: number; losses: number; draws: number; noContests?: number }): string {
  return `${wins}-${losses}-${draws}`;
}

function noContestsLabel(noContests: number): string | null {
  return noContests > 0 ? `${noContests} sin resultado` : null;
}

function isEmpty(record: ManualRecord): boolean {
  return record.wins + record.losses + record.draws + record.noContests === 0;
}

const hasFights = (record: ComputedRecord): boolean => !isEmpty(record);

const RECORD_CLASS = "font-display text-[clamp(44px,12vw,88px)] leading-none tabular-nums whitespace-nowrap text-white";

function TotalRecord({ record, title }: { record: ManualRecord; title: string }) {
  const extra = noContestsLabel(record.noContests);
  return (
    <>
      <p className={RECORD_CLASS} aria-label={`Récord total ${title.toLowerCase()}: ${formatRecord(record)}`}>
        {formatRecord(record)}
      </p>
      {extra ? <p className="mt-2 text-sm text-muted-foreground">{extra}</p> : null}
    </>
  );
}

function PromotionRecord({ record, title }: { record: ComputedRecord; title: string }) {
  const extra = [noContestsLabel(record.noContests), record.streak ? `Racha: ${record.streak.count} ${STREAK_LABELS[record.streak.type]}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <p className={RECORD_CLASS} aria-label={`Récord en ${BRAND.name} ${title.toLowerCase()}: ${formatRecord(record)}`}>
        {formatRecord(record)}
      </p>
      {extra ? <p className="mt-2 text-sm text-muted-foreground">{extra}</p> : null}
      <ul className="mx-auto mt-4 grid w-full max-w-xs grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
        {METHOD_LABELS.map(({ key, label }) => (
          <li key={key} className="flex justify-between gap-2">
            <span>{label}</span>
            <span className="font-bold tabular-nums text-white">{record.winsBy[key]}</span>
          </li>
        ))}
        {record.finishRate !== null ? (
          <li className="col-span-2 flex justify-between gap-2">
            <span>Finalizaciones</span>
            <span className="font-bold tabular-nums text-white">{Math.round(record.finishRate * 100)} %</span>
          </li>
        ) : null}
        {record.avgFightSeconds !== null ? (
          <li className="col-span-2 flex justify-between gap-2">
            <span>Tiempo promedio</span>
            <span data-average-time className="font-bold tabular-nums text-white">
              {formatClock(record.avgFightSeconds)}
            </span>
          </li>
        ) : null}
      </ul>
    </>
  );
}

const labelClass = "mb-2 font-cond text-[13px] font-bold uppercase tracking-[.16em] text-muted-foreground";

/**
 * Récord profesional y amateur por separado, centrados y hacia abajo: el récord total (manual) y, debajo, el de
 * ShowBox (calculado) con sus métodos de victoria. Lo que no tiene datos no se muestra: sin récord amateur no hay
 * bloque amateur, sin peleas en ShowBox no hay récord de ShowBox, y sin nada de eso no hay sección.
 */
export function RecordSummary({ manual, computed }: RecordSummaryProps) {
  const levels = (
    [
      { key: "pro", title: "Profesional", titleClass: "text-accent-bright" },
      { key: "amateur", title: "Amateur", titleClass: "text-[#FF7A1A]" },
    ] as const
  )
    .map((level) => ({ ...level, showTotal: !isEmpty(manual[level.key]), showGc: hasFights(computed[level.key]) }))
    .filter((level) => level.showTotal || level.showGc);

  if (levels.length === 0) return null;

  return (
    <section aria-labelledby="fighter-record-heading" className="border-y border-border bg-[#0a0a0a]">
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] py-14 text-center lg:py-20">
        <div className="mb-12">
          <SectionTitle id="fighter-record-heading">Récord</SectionTitle>
        </div>
        <div className={`mx-auto grid max-w-4xl gap-14 ${levels.length > 1 ? "md:grid-cols-2" : ""}`}>
          {levels.map(({ key, title, titleClass, showTotal, showGc }) => (
            <div key={key} data-level={key}>
              <h3 className={`mb-4 font-cond text-[clamp(15px,4.4vw,22px)] font-extrabold uppercase tracking-[.16em] whitespace-nowrap ${titleClass}`}>Récord {title.toLowerCase()}</h3>
              <div data-record-list className="flex flex-col items-center gap-8">
                {showTotal ? (
                  <div data-record="total">
                    <TotalRecord record={manual[key]} title={title} />
                  </div>
                ) : null}
                {showGc ? (
                  <div data-record="gc" className="w-full">
                    <p className={labelClass}>{BRAND.name}</p>
                    <PromotionRecord record={computed[key]} title={title} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

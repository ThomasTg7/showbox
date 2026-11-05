import { championWord } from "@/domain/rankings";

/** Full-width champion strip using the original belt gold. */
export function BoutRankBadge({ rankLabel, gender }: { rankLabel?: string; gender: "male" | "female" }) {
  const champion = rankLabel === "C";
  return (
    <span className="flex h-6 items-center justify-center sm:h-7">
      <span
        data-slot="bout-rank"
        className={`empty:hidden font-cond font-extrabold uppercase ${
          champion
            ? "flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#F4DE8C_0%,#D4AF37_45%,#A8832C_100%)] px-1 text-[11px] tracking-[.12em] text-white sm:text-xs"
            : "text-[13px] tracking-[.06em] text-neutral-500 sm:text-sm"
        }`}
      >
        {champion ? championWord(gender) : rankLabel}
      </span>
    </span>
  );
}

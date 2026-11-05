import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeadingTone = "dark" | "light";

type SectionHeadingProps = {
  kicker: string;
  title: ReactNode;
  action?: ReactNode;
  tone?: SectionHeadingTone;
  /** `id` del `h2`, para el `aria-labelledby` de la sección. */
  titleId?: string;
  /** Entra con `ScrollReveal` (`data-reveal`). */
  reveal?: boolean;
  className?: string;
};

/** Rótulo de marca con raya y título grande de sección y, a la derecha, una acción opcional. */
export function SectionHeading({ kicker, title, action, tone = "dark", titleId, reveal = false, className }: SectionHeadingProps) {
  const isLight = tone === "light";

  return (
    <div data-reveal={reveal || undefined} className={cn("flex flex-wrap items-end justify-between gap-5 mb-11", className)}>
      <div>
        <div
          className={cn(
            "flex items-center gap-2.5 mb-3.5 font-cond font-extrabold uppercase tracking-[.32em] text-[12px] before:block before:h-[4px] before:w-8 before:-skew-x-[20deg] before:bg-brand-bright",
            isLight ? "text-black" : "sb-gradient-text",
          )}
        >
          {kicker}
        </div>
        <h2
          id={titleId}
          className={cn(
            "font-display uppercase leading-[.92] tracking-[-.01em] text-[clamp(34px,5.2vw,68px)]",
            isLight ? "text-black" : "text-white",
          )}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

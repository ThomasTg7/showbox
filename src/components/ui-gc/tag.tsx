import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TagTone = "brand" | "dark" | "red" | "outline" | "ember";

type TagProps = {
  tone: TagTone;
  children: ReactNode;
};

const toneClasses: Record<TagTone, string> = {
  brand: "bg-brand text-white",
  dark: "bg-black text-accent-bright",
  red: "bg-red text-white",
  outline: "border border-white/40 text-white",
  ember: "bg-brand-ember text-white",
};

export function Tag({ tone, children }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 font-cond font-extrabold uppercase tracking-[.18em] text-[11px]",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

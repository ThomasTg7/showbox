import { cn } from "@/lib/cn";

/**
 * El gesto de los afiches ShowBox: dos cortes diagonales rojos que cruzan la escena (como las franjas detrás del careo),
 * con un filo claro que imita el reflejo de los focos. Solo decoración.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 400 400" fill="none" preserveAspectRatio="xMidYMid slice" className={cn("pointer-events-none", className)}>
      <defs>
        <linearGradient id="sb-slash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF1226" stopOpacity=".95" />
          <stop offset="1" stopColor="#8E1B17" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <path d="M300 -20 L360 -20 L150 420 L90 420 Z" fill="url(#sb-slash)" />
      <path d="M380 60 L400 60 L240 420 L220 420 Z" fill="#FF1226" fillOpacity=".55" />
      <path d="M360 -20 L364 -20 L154 420 L150 420 Z" fill="#fff" fillOpacity=".25" />
    </svg>
  );
}

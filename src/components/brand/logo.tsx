import Image from "next/image";
import { BRAND } from "@/domain/brand";
import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg";

type LogoProps = {
  size?: LogoSize;
  priority?: boolean;
  /** Solo «SHOWBOX», sin la línea «PROMOTIONS» (espacios muy bajos, como la presentación de entrada). */
  wordmark?: boolean;
  /** Ancho a medida (p. ej. dentro de una tarjeta); pisa el del tamaño. */
  className?: string;
};

// El logo completo mide 800×246; el wordmark, 800×136. Las cajas reservan esa proporción: no hay salto de diseño.
const sizeClasses: Record<LogoSize, string> = {
  sm: "w-[110px]",
  md: "w-[150px]",
  lg: "w-[min(560px,82vw)]",
};

/** El logotipo ShowBox Promotions entregado por la promotora, recortado sobre fondo transparente. */
export function Logo({ size = "md", priority = false, wordmark = false, className }: LogoProps) {
  return (
    <span
      role="img"
      aria-label={BRAND.name}
      className={cn("relative inline-block shrink-0", wordmark ? "aspect-[800/136]" : "aspect-[800/246]", sizeClasses[size], className)}
    >
      <Image
        src={wordmark ? "/showbox-wordmark.webp" : "/showbox-logo.webp"}
        alt=""
        aria-hidden
        fill
        priority={priority}
        sizes={size === "lg" ? "560px" : "150px"}
        className="object-contain"
      />
    </span>
  );
}

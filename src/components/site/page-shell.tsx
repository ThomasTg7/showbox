import { BRAND } from "@/domain/brand";
import type { ReactNode } from "react";

/** Contenedor de una página del sitio: ancho de la maqueta y espacio bajo el header fijo. */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] pb-24 pt-[calc(76px+clamp(32px,6vw,72px))]">{children}</div>;
}

type PageHeaderProps = { title: string; kicker?: string; className?: string; children?: ReactNode };

/** Cabecera de una página: la etiqueta de acento y el único `h1`. `children` va debajo (bajada, fecha…). */
export function PageHeader({ title, kicker = `${BRAND.name}`, className = "mb-14", children }: PageHeaderProps) {
  return (
    <header className={className}>
      <p className="mb-3.5 flex items-center gap-2.5 font-cond text-[12px] font-extrabold uppercase tracking-[.32em] text-accent-bright before:block before:h-[4px] before:w-8 before:-skew-x-[20deg] before:bg-brand-bright">
        {kicker}
      </p>
      <h1 className="sb-chrome-text sb-punch-in font-display text-[clamp(32px,8.5vw,88px)] uppercase leading-[.92] tracking-[-.01em] text-white">{title}</h1>
      {children}
    </header>
  );
}

/** Estado vacío de una página sin contenido todavía: nunca un bloque en blanco. */
export function PageEmpty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-border px-6 py-16 text-center">
      <p className="font-display text-[clamp(22px,4.5vw,36px)] uppercase leading-none text-white">{title}</p>
      <p className="max-w-md font-cond uppercase tracking-[.06em] text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

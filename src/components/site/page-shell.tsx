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
      <p className="mb-3.5 flex items-center gap-2.5 font-cond text-[13px] font-extrabold uppercase tracking-[.2em] text-accent-bright before:block before:h-[3px] before:w-7 before:bg-brand">
        {kicker}
      </p>
      <h1 className="font-display text-[clamp(44px,8vw,96px)] uppercase leading-[.9] text-white">{title}</h1>
      {children}
    </header>
  );
}

/** Estado vacío de una página sin contenido todavía: nunca un bloque en blanco. */
export function PageEmpty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-border px-6 py-16 text-center">
      <p className="font-display text-[clamp(26px,4.5vw,40px)] uppercase leading-none text-white">{title}</p>
      <p className="max-w-md font-cond uppercase tracking-[.06em] text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

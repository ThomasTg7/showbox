import type { ReactNode } from "react";

export function siteFieldErrorId(id: string): string {
  return `${id}-error`;
}

/** Clases de un campo de texto del sitio: caja alta, recta, sobre el gris de la marca. */
export const SITE_INPUT_CLASS = "h-12 rounded-none border-border bg-surface px-4 text-base text-white";

type SiteFieldProps = {
  id: string;
  label: string;
  /** Un dato que no es obligatorio dice «(opcional)» junto a la etiqueta. */
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Etiqueta visible, ayuda y error en línea de un campo de los formularios públicos. */
export function SiteField({ id, label, optional = false, error, hint, children }: SiteFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-cond text-sm font-bold uppercase tracking-[.1em] text-white">
        {label}
        {optional ? <span className="ml-2 font-medium normal-case tracking-normal text-muted-foreground">(opcional)</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={siteFieldErrorId(id)} role="alert" className="text-sm font-medium text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Atributos de accesibilidad de un campo con error posible. */
export function siteFieldProps(id: string, error?: string) {
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? siteFieldErrorId(id) : undefined };
}

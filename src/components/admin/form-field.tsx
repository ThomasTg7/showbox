import type { ReactNode } from "react";
import { HelpTip } from "@/components/admin/help-tip";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  /** Explicación más larga detrás de un «?» junto a la etiqueta. */
  help?: ReactNode;
  children: ReactNode;
};

export function formFieldErrorId(id: string): string {
  return `${id}-error`;
}

export function FormField({ id, label, error, hint, help, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {help ? (
        <div className="flex items-center gap-0.5">
          <Label htmlFor={id}>{label}</Label>
          <HelpTip topic={label}>{help}</HelpTip>
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={formFieldErrorId(id)} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

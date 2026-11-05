import type { ReactNode } from "react";
import { HelpTip } from "@/components/admin/help-tip";

type WizardStepProps = {
  number: number;
  title: string;
  /** Lo que se explica detrás del «?» junto al título. */
  help: ReactNode;
  children: ReactNode;
};

/** Un paso numerado de «Con IA»: número grande, título y su «?». */
export function WizardStep({ number, title, help, children }: WizardStepProps) {
  const headingId = `ai-step-${number}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center bg-primary text-lg font-bold text-primary-foreground">
          {number}
        </span>
        <h3 id={headingId} className="font-semibold">
          <span className="sr-only">Paso {number}: </span>
          {title}
        </h3>
        <HelpTip topic={title}>{help}</HelpTip>
      </div>
      {children}
    </section>
  );
}

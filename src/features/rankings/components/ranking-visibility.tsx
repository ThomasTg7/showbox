"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { BoutLevel } from "@/domain/bout-enums";
import { setRankingVisibilityAction } from "../actions";

const LEVEL_NAME: Record<BoutLevel, string> = { pro: "pro", amateur: "amateur" };

/**
 * ¿El público ve los puestos de este nivel? Ocultos, se siguen armando en el panel y el sitio muestra solo a los
 * campeones (en Rankings, las fichas, la cartelera y Boxeadores); los números (#1, libra por libra) no salen.
 */
export function RankingVisibility({ level, isPublic }: { level: BoutLevel; isPublic: boolean }) {
  const [isPending, startTransition] = useTransition();
  const name = LEVEL_NAME[level];

  function toggle() {
    startTransition(async () => {
      const result = await setRankingVisibilityAction(level, !isPublic);
      if (result.error) return void toast.error(result.error);
      toast.success(result.success ?? "Listo");
    });
  }

  return (
    <section
      aria-labelledby="ranking-visibility-title"
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 border p-3 ${isPublic ? "border-border bg-card" : "border-primary bg-primary/10"}`}
    >
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-2">
        {isPublic ? <Eye aria-hidden className="mt-0.5 size-5 shrink-0" /> : <EyeOff aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-bright" />}
        <div className="flex flex-col gap-1">
          <h2 id="ranking-visibility-title" className="font-semibold">
            {isPublic ? `Rankings ${name} visibles en el sitio` : `Puestos ${name} ocultos: solo se ven los campeones`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isPublic
              ? "El público ve los campeones y los puestos en Rankings, en las fichas, en la cartelera y en Boxeadores."
              : "Puedes armar los puestos con calma: el público solo ve a los campeones hasta que muestres los rankings."}
          </p>
        </div>
      </div>
      <Button type="button" variant={isPublic ? "outline" : "default"} disabled={isPending} onClick={toggle}>
        {isPublic ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        {isPublic ? "Ocultar puestos" : "Mostrar puestos"}
      </Button>
    </section>
  );
}

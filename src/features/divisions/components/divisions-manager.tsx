"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Division } from "@/db/schema/divisions";
import type { FormActionState } from "@/lib/form-errors";
import { reorderDivisionsAction, toggleDivisionAction } from "../actions";
import { DivisionForm } from "./division-form";

const DivisionGroup = dynamic(() => import("./division-group"), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />,
});

const GROUPS = [
  { gender: "male", title: "Masculinas" },
  { gender: "female", title: "Femeninas" },
] as const;

function compareDivisions(a: Division, b: Division): number {
  if (a.gender !== b.gender) return a.gender === "male" ? -1 : 1;
  return a.sortOrder - b.sortOrder;
}

export function DivisionsManager({ divisions }: { divisions: Division[] }) {
  const [target, setTarget] = useState<Division | "new" | null>(null);
  const [isPending, startTransition] = useTransition();
  // Refleja el cambio al instante; si la action falla, React vuelve a la lista del servidor.
  const [optimistic, applyOptimistic] = useOptimistic(divisions, (current, changed: Division[]) => {
    const changedIds = new Set(changed.map((division) => division.id));
    return [...current.filter((division) => !changedIds.has(division.id)), ...changed].sort(compareDivisions);
  });

  function report(result: FormActionState) {
    if (result.error) toast.error(result.error);
    else if (result.success) toast.success(result.success);
  }

  function reorder(gender: Division["gender"], orderedIds: string[]) {
    const byId = new Map(divisions.map((division) => [division.id, division]));
    startTransition(async () => {
      applyOptimistic(orderedIds.flatMap((id, index) => (byId.has(id) ? [{ ...byId.get(id)!, sortOrder: index + 1 }] : [])));
      report(await reorderDivisionsAction(gender, orderedIds));
    });
  }

  function toggle(division: Division, active: boolean) {
    startTransition(async () => {
      applyOptimistic([{ ...division, active }]);
      report(await toggleDivisionAction(division.id, active));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button type="button" onClick={() => setTarget("new")}>
          <Plus aria-hidden /> Nueva división
        </Button>
      </div>
      {GROUPS.map(({ gender, title }) => {
        const items = optimistic.filter((division) => division.gender === gender);
        return (
          <section key={gender} className="flex flex-col gap-3" aria-labelledby={`divisions-${gender}`}>
            <h2 id={`divisions-${gender}`} className="text-lg font-semibold">
              {title}
            </h2>
            {items.length === 0 ? (
              <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Aún no hay divisiones {title.toLowerCase()}. Crea la primera con «Nueva división».
              </p>
            ) : (
              <DivisionGroup
                divisions={items}
                disabled={isPending}
                onReorder={(orderedIds) => reorder(gender, orderedIds)}
                onEdit={setTarget}
                onToggle={toggle}
              />
            )}
          </section>
        );
      })}
      <DivisionForm target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { restoreAction } from "../actions";
import type { TrashItem } from "../trash";

export function TrashManager({ items }: { items: TrashItem[] }) {
  const [isRestoring, startRestoring] = useTransition();

  function handleRestore(item: TrashItem) {
    startRestoring(async () => {
      const result = await restoreAction(item.entityType, item.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Restauraste ${item.entityLabel.toLowerCase()} «${item.title}»`);
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground">
        La papelera está vacía. Lo que envíes a la papelera queda aquí 30 días antes de borrarse para siempre.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={`${item.entityType}:${item.id}`}
          className="border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{item.entityLabel}</p>
            <p className="font-medium break-words">{item.title}</p>
            <p className="text-sm text-muted-foreground">Enviado a la papelera el {formatDate(item.deletedAt)}</p>
          </div>
          <Button type="button" disabled={isRestoring} onClick={() => handleRestore(item)}>
            Restaurar
          </Button>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setInboxStatusAction } from "../admin-actions";
import type { InboxStatus } from "../queries";

const ACTIONS: { status: InboxStatus; label: string; from: InboxStatus[] }[] = [
  { status: "contacted", label: "Marcar como contactado", from: ["new", "discarded"] },
  { status: "discarded", label: "Descartar", from: ["new", "contacted"] },
  { status: "new", label: "Volver a nuevo", from: ["contacted", "discarded"] },
];

/** Botones para cambiar el estado de un mensaje: solo los cambios que tienen sentido desde el estado actual. */
export function InboxStatusButtons({ id, status }: { id: string; status: InboxStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: InboxStatus) {
    startTransition(async () => {
      const result = await setInboxStatusAction(id, next);
      if (result.error) toast.error(result.error);
      else if (result.success) {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.filter((action) => action.from.includes(status)).map((action) => (
        <Button key={action.status} type="button" variant={action.status === "contacted" ? "default" : "outline"} disabled={isPending} onClick={() => change(action.status)}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}

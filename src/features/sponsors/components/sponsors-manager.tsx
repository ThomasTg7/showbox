"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SPONSOR_TIER_LABELS, SPONSOR_TIERS, type SponsorTier } from "@/domain/sponsors";
import type { FormActionState } from "@/lib/form-errors";
import { deleteSponsorAction, reorderSponsorsAction } from "../actions";
import type { AdminSponsorRow } from "../dto";
import { SponsorForm } from "./sponsor-form";

const SponsorGroup = dynamic(() => import("./sponsor-group"), { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> });

const TIER_HINT: Record<SponsorTier, string> = {
  principal: "Salen primero, más grandes, en la home, en cada evento y en el pie de página.",
  oficial: "Salen en la home y en cada evento.",
  colaborador: "Salen solo en la página de sus eventos.",
};

function byTierAndOrder(a: AdminSponsorRow, b: AdminSponsorRow): number {
  return SPONSOR_TIERS.indexOf(a.tier) - SPONSOR_TIERS.indexOf(b.tier) || a.sortOrder - b.sortOrder;
}

export function SponsorsManager({ sponsors }: { sponsors: AdminSponsorRow[] }) {
  const [target, setTarget] = useState<AdminSponsorRow | "new" | null>(null);
  const [toDelete, setToDelete] = useState<AdminSponsorRow | null>(null);
  const [isPending, startTransition] = useTransition();
  // Refleja el nuevo orden al instante; si la action falla, React vuelve a la lista del servidor.
  const [optimistic, applyOptimistic] = useOptimistic(sponsors, (current, ordered: AdminSponsorRow[]) => {
    const changed = new Set(ordered.map((sponsor) => sponsor.id));
    return [...current.filter((sponsor) => !changed.has(sponsor.id)), ...ordered].sort(byTierAndOrder);
  });

  function report(result: FormActionState) {
    if (result.error) toast.error(result.error);
    else if (result.success) toast.success(result.success);
  }

  function reorder(tier: SponsorTier, orderedIds: string[]) {
    const byId = new Map(sponsors.map((sponsor) => [sponsor.id, sponsor]));
    startTransition(async () => {
      applyOptimistic(orderedIds.flatMap((id, index) => (byId.has(id) ? [{ ...byId.get(id)!, sortOrder: index }] : [])));
      report(await reorderSponsorsAction(tier, orderedIds));
    });
  }

  function confirmDelete() {
    const sponsor = toDelete;
    if (!sponsor) return;
    startTransition(async () => {
      report(await deleteSponsorAction(sponsor.id));
      setToDelete(null);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button type="button" onClick={() => setTarget("new")}>
          <Plus aria-hidden /> Nuevo patrocinador
        </Button>
      </div>
      {optimistic.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aún no hay patrocinadores. Agrega el primero con «Nuevo patrocinador».</p>
      ) : null}
      {SPONSOR_TIERS.map((tier) => {
        const items = optimistic.filter((sponsor) => sponsor.tier === tier);
        if (items.length === 0) return null;
        return (
          <section key={tier} className="flex flex-col gap-3" aria-labelledby={`sponsors-${tier}`}>
            <div>
              <h2 id={`sponsors-${tier}`} className="text-lg font-semibold">
                {SPONSOR_TIER_LABELS[tier]}
              </h2>
              <p className="text-sm text-muted-foreground">{TIER_HINT[tier]}</p>
            </div>
            <SponsorGroup sponsors={items} disabled={isPending} onReorder={(orderedIds) => reorder(tier, orderedIds)} onEdit={setTarget} onDelete={setToDelete} />
          </section>
        );
      })}
      <SponsorForm target={target} onClose={() => setTarget(null)} />
      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a la papelera: {toDelete?.name}</DialogTitle>
            <DialogDescription>Deja de verse en el sitio. Puedes restaurarlo desde la Papelera durante 30 días.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToDelete(null)}>
              Volver
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={confirmDelete}>
              Enviar a la papelera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

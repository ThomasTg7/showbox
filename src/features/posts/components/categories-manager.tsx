"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormActionState } from "@/lib/form-errors";
import { deleteCategoryAction, reorderCategoriesAction, saveCategoryAction } from "../category-actions";
import type { CategoryRow } from "../dto";

type Editing = { id: string | null; name: string } | null;

const usageLabel = (count: number) => (count === 0 ? "Sin noticias" : count === 1 ? "1 noticia" : `${count} noticias`);

/** Catálogo editable de categorías de noticias: agregar, renombrar, ordenar (subir y bajar) y quitar las que no tienen noticias. */
export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  // Refleja el orden al instante; si la action falla, React vuelve a la lista del servidor.
  const [optimistic, applyOrder] = useOptimistic(categories, (current, orderedIds: string[]) =>
    orderedIds.flatMap((id) => current.filter((category) => category.id === id)),
  );

  function report(result: FormActionState): boolean {
    if (result.error) toast.error(result.error);
    else if (result.success) toast.success(result.success);
    return !result.error;
  }

  function move(index: number, delta: -1 | 1) {
    const ids = optimistic.map((category) => category.id);
    [ids[index], ids[index + delta]] = [ids[index + delta]!, ids[index]!];
    startTransition(async () => {
      applyOrder(ids);
      report(await reorderCategoriesAction(ids));
    });
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      if (report(await saveCategoryAction({ name: newName }))) setNewName("");
    });
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    startTransition(async () => {
      if (report(await saveCategoryAction({ id: editing.id, name: editing.name }))) setEditing(null);
    });
  }

  function confirmRemove() {
    if (!removing) return;
    startTransition(async () => {
      report(await deleteCategoryAction(removing.id));
      setRemoving(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3" aria-label="Agregar categoría">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor="category-new">Nueva categoría</Label>
          <Input id="category-new" value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} placeholder="Ej.: Entrenamientos" autoComplete="off" />
        </div>
        <Button type="submit" disabled={isPending || newName.trim() === ""}>
          <Plus aria-hidden /> Agregar
        </Button>
      </form>

      {optimistic.length === 0 ? (
        <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aún no hay categorías. Agrega la primera arriba.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {optimistic.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-border bg-card p-3">
              <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                <span className="font-medium break-words">{category.name}</span>
                <span className="text-sm text-muted-foreground">{usageLabel(category.postCount)}</span>
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" size="icon" disabled={isPending || index === 0} aria-label={`Subir ${category.name}`} onClick={() => move(index, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" variant="outline" size="icon" disabled={isPending || index === optimistic.length - 1} aria-label={`Bajar ${category.name}`} onClick={() => move(index, 1)}>
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" variant="outline" disabled={isPending} onClick={() => setEditing({ id: category.id, name: category.name })} aria-label={`Renombrar ${category.name}`}>
                  <Pencil aria-hidden /> Renombrar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  disabled={isPending || category.postCount > 0}
                  title={category.postCount > 0 ? "Tiene noticias: cámbialas de categoría antes de eliminarla" : undefined}
                  aria-label={`Eliminar ${category.name}`}
                  onClick={() => setRemoving(category)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <form onSubmit={saveEdit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Renombrar categoría</DialogTitle>
              <DialogDescription>El cambio se ve en todas las noticias de la categoría. Los enlaces de los filtros no cambian.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category-edit">Nombre</Label>
              <Input id="category-edit" value={editing?.name ?? ""} maxLength={40} onChange={(event) => setEditing((current) => (current ? { ...current, name: event.target.value } : current))} autoComplete="off" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || (editing?.name.trim() ?? "") === ""}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar categoría</DialogTitle>
            <DialogDescription>«{removing?.name}» dejará de estar en la lista. Como no tiene noticias, no afecta a ninguna.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={confirmRemove}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

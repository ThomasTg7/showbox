"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import type { AdminSponsorRow } from "../dto";

type SponsorRowProps = {
  sponsor: AdminSponsorRow;
  position: number;
  total: number;
  disabled: boolean;
  onMove: (delta: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Texto de la vigencia: «Del 1-10-2026 al 31-12-2026», «Hasta …», «Desde …» o «Sin fecha de término». */
function describeWindow({ startsOn, endsOn }: Pick<AdminSponsorRow, "startsOn" | "endsOn">): string {
  const day = (value: string) => formatDate(new Date(`${value}T12:00:00Z`));
  if (startsOn && endsOn) return `Del ${day(startsOn)} al ${day(endsOn)}`;
  if (endsOn) return `Hasta el ${day(endsOn)}`;
  if (startsOn) return `Desde el ${day(startsOn)}`;
  return "Sin fecha de término";
}

function statusBadge({ active, validity }: Pick<AdminSponsorRow, "active" | "validity">) {
  if (!active) return <Badge variant="outline">Oculto</Badge>;
  if (validity === "expired") return <Badge variant="outline">Vencido</Badge>;
  if (validity === "upcoming") return <Badge variant="secondary">Empieza pronto</Badge>;
  return <Badge>Visible</Badge>;
}

export function SponsorRow({ sponsor, position, total, disabled, onMove, onEdit, onDelete }: SponsorRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sponsor.id, disabled });
  const label = sponsor.name;
  const scope = sponsor.allEvents ? "Todos los eventos" : sponsor.events.map((event) => event.name).join(", ");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-sponsor={sponsor.name}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 border border-border bg-card p-3 ${isDragging ? "relative z-10 opacity-80" : ""}`}
    >
      <Button type="button" variant="ghost" size="icon" className="cursor-grab touch-none" aria-label={`Arrastrar ${label} para reordenar`} {...attributes} {...listeners}>
        <GripVertical aria-hidden />
      </Button>
      {sponsor.logo ? (
        // Fondo claro: los logos son SVG/PNG sin fondo y muchos son oscuros.
        // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel; el logo ya viene optimizado
        <img src={sponsor.logo.variants[0]?.url ?? sponsor.logo.originalUrl} alt="" className="h-12 w-24 shrink-0 bg-white object-contain p-1" />
      ) : (
        <span className="grid h-12 w-24 shrink-0 place-items-center bg-muted text-xs text-muted-foreground">Sin logo</span>
      )}
      <div className="flex min-w-0 flex-1 basis-44 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {sponsor.name}
          {statusBadge(sponsor)}
        </span>
        <span className="text-sm text-muted-foreground">{describeWindow(sponsor)}</span>
        <span className="text-sm text-muted-foreground">{scope}</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === 0} aria-label={`Subir ${label}`} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="icon" disabled={disabled || position === total - 1} aria-label={`Bajar ${label}`} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden />
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={onEdit}>
          <Pencil aria-hidden /> Editar
        </Button>
        <Button type="button" variant="outline" disabled={disabled} aria-label={`Enviar ${label} a la papelera`} onClick={onDelete}>
          <Trash2 aria-hidden /> Papelera
        </Button>
      </div>
    </li>
  );
}

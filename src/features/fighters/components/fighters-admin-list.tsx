import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Flag } from "@/components/ui-gc/flag";
import { countryName } from "@/domain/units";
import { AdminFighterThumb } from "@/features/events/components/admin-fighter-thumb";
import { PublicationBadge } from "@/features/publication/components/publication-badge";
import { formatDate } from "@/lib/format-date";
import type { AdminFighterRow } from "../dto";
import { CAREER_STATUS_LABELS } from "../labels";
import { FighterRowActions } from "./fighter-row-actions";

function displayName(fighter: AdminFighterRow): string {
  return `${fighter.firstName} ${fighter.lastName}`;
}

function Details({ fighter }: { fighter: AdminFighterRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-medium break-words">{displayName(fighter)}</span>
      {fighter.nickname ? <span className="text-sm text-muted-foreground">«{fighter.nickname}»</span> : null}
    </div>
  );
}

export function FightersAdminList({ fighters, hasFilters }: { fighters: AdminFighterRow[]; hasFilters: boolean }) {
  if (fighters.length === 0) {
    return (
      <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
        {hasFilters
          ? "Ningún boxeador coincide con esos filtros. Prueba con otra búsqueda."
          : "Todavía no hay boxeadores. Crea el primero con «Nuevo boxeador»."}
      </p>
    );
  }

  return (
    <>
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead>Boxeador</TableHead>
            <TableHead>División</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Actualizado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fighters.map((fighter) => (
            <TableRow key={fighter.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <AdminFighterThumb fighter={fighter} className="size-12" />
                  <Details fighter={fighter} />
                </div>
              </TableCell>
              <TableCell>{fighter.divisionName}</TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <Flag code={fighter.nationality} /> {countryName(fighter.nationality)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <PublicationBadge status={fighter.status} publishAt={fighter.publishAt} />
                  {fighter.careerStatus === "active" ? null : <span className="text-xs text-muted-foreground">{CAREER_STATUS_LABELS[fighter.careerStatus]}</span>}
                </div>
              </TableCell>
              <TableCell>{formatDate(fighter.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <FighterRowActions id={fighter.id} name={displayName(fighter)} status={fighter.status} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul className="flex flex-col gap-3 sm:hidden">
        {fighters.map((fighter) => (
          <li key={fighter.id} className="flex flex-col gap-3 border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <AdminFighterThumb fighter={fighter} className="size-12" />
              <Details fighter={fighter} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Flag code={fighter.nationality} /> {countryName(fighter.nationality)}
              </span>
              <span>{fighter.divisionName}</span>
              <PublicationBadge status={fighter.status} publishAt={fighter.publishAt} />
              {fighter.careerStatus === "active" ? null : <span>{CAREER_STATUS_LABELS[fighter.careerStatus]}</span>}
            </div>
            <FighterRowActions id={fighter.id} name={displayName(fighter)} status={fighter.status} />
          </li>
        ))}
      </ul>
    </>
  );
}

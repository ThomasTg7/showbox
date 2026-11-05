import { adminPath } from "@/lib/site-urls";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Division } from "@/db/schema/divisions";

type FightersAdminFiltersProps = {
  divisions: Division[];
  values: { q: string; division: string; publicacion: string; estado: string };
};

/** Formulario GET: los filtros viven en la URL (se pueden compartir y el botón «atrás» funciona). */
export function FightersAdminFilters({ divisions, values }: FightersAdminFiltersProps) {
  return (
    <form method="get" role="search" className="grid grid-cols-2 gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium lg:col-span-1">
        Buscar
        <Input name="q" defaultValue={values.q} placeholder="Nombre, apellido o apodo" type="search" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        División
        <NativeSelect name="division" defaultValue={values.division}>
          <option value="">Todas</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.slug}>
              {division.name}
              {division.gender === "female" ? " (fem.)" : ""}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Publicación
        <NativeSelect name="publicacion" defaultValue={values.publicacion}>
          <option value="">Todas</option>
          <option value="published">Publicados</option>
          <option value="scheduled">Programados</option>
          <option value="draft">Borradores</option>
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Carrera
        <NativeSelect name="estado" defaultValue={values.estado}>
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="retired">Retirados</option>
        </NativeSelect>
      </label>
      <div className="col-span-2 flex gap-2 lg:col-span-1">
        <Button type="submit" className="flex-1 lg:flex-none">
          Filtrar
        </Button>
        <Button asChild variant="outline">
          <Link href={adminPath("/boxeadores")}>Limpiar</Link>
        </Button>
      </div>
    </form>
  );
}

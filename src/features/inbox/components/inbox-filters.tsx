import Link from "next/link";
import { adminPath } from "@/lib/site-urls";
import type { InboxFilters } from "../queries";

const KIND_OPTIONS: { value: InboxFilters["kind"]; label: string; param: string }[] = [
  { value: undefined, label: "Todos", param: "" },
  { value: "fighter_application", label: "Quiero pelear", param: "postulaciones" },
  { value: "sponsorship", label: "Patrocinio", param: "patrocinio" },
];

const STATUS_OPTIONS: { value: InboxFilters["status"]; label: string; param: string }[] = [
  { value: undefined, label: "Todos", param: "" },
  { value: "new", label: "Nuevos", param: "nuevos" },
  { value: "contacted", label: "Contactados", param: "contactados" },
  { value: "discarded", label: "Descartados", param: "descartados" },
];

/** Los textos de la URL (`?tipo=postulaciones&estado=nuevos`) y lo que filtran. */
export const KIND_PARAMS = Object.fromEntries(KIND_OPTIONS.filter((option) => option.value).map((option) => [option.param, option.value!])) as Record<string, NonNullable<InboxFilters["kind"]>>;
export const STATUS_PARAMS = Object.fromEntries(STATUS_OPTIONS.filter((option) => option.value).map((option) => [option.param, option.value!])) as Record<string, NonNullable<InboxFilters["status"]>>;

function href(kindParam: string, statusParam: string): string {
  const query = new URLSearchParams();
  if (kindParam) query.set("tipo", kindParam);
  if (statusParam) query.set("estado", statusParam);
  const search = query.toString();
  return adminPath(search ? `/bandeja?${search}` : "/bandeja");
}

const LINK_CLASS = "inline-flex min-h-11 items-center border px-4 text-sm font-semibold";

function FilterGroup({ label, options, current, link }: { label: string; options: { label: string; param: string }[]; current: string; link: (param: string) => string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          key={option.param || "todos"}
          href={link(option.param)}
          aria-current={option.param === current ? "page" : undefined}
          className={`${LINK_CLASS} ${option.param === current ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

/** Filtros por tipo y por estado como enlaces (cada uno conserva el otro): el filtro vive en la URL. */
export function InboxFiltersBar({ kindParam, statusParam }: { kindParam: string; statusParam: string }) {
  return (
    <div className="flex flex-col gap-3">
      <FilterGroup label="Tipo de mensaje" options={KIND_OPTIONS} current={kindParam} link={(param) => href(param, statusParam)} />
      <FilterGroup label="Estado del mensaje" options={STATUS_OPTIONS} current={statusParam} link={(param) => href(kindParam, param)} />
    </div>
  );
}

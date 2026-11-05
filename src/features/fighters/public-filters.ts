import { parsePageParam } from "@/lib/pagination";
import type { FighterFilters } from "./schema";

type SearchParams = Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 60;
const GENDERS = ["male", "female"] as const;
const STATUSES = ["active", "inactive", "retired"] as const;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return allowed.find((option) => option === value);
}

/** Filtros del listado público desde la URL (`?q=&division=&pais=&genero=&estado=&pagina=`). Lo inválido se ignora. Por defecto solo activos. */
export function parsePublicFilters(params: SearchParams): { filters: FighterFilters; page: number } {
  const filters: FighterFilters = {};
  const q = first(params.q).slice(0, MAX_QUERY_LENGTH);
  if (q) filters.q = q;

  const division = typeof params.division === "string" ? params.division.trim() : "";
  if (/^[a-z0-9-]+$/.test(division)) filters.division = division;

  const nationality = first(params.pais).toUpperCase();
  if (/^[A-Z]{2}$/.test(nationality)) filters.nationality = nationality;

  const gender = oneOf(first(params.genero), GENDERS);
  if (gender) filters.gender = gender;

  const estado = first(params.estado);
  if (estado !== "all") filters.status = oneOf(estado, STATUSES) ?? "active";

  return { filters, page: parsePageParam(params.pagina) };
}

/** URL compartible del listado. Omite lo que es valor por defecto (estado activo, página 1). */
export function fightersHref(filters: FighterFilters, page: number): string {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.division) query.set("division", filters.division);
  if (filters.nationality) query.set("pais", filters.nationality);
  if (filters.gender) query.set("genero", filters.gender);
  if (filters.status === undefined) query.set("estado", "all");
  else if (filters.status !== "active") query.set("estado", filters.status);
  if (page > 1) query.set("pagina", String(page));
  const search = query.toString();
  return search ? `/boxeadores?${search}` : "/boxeadores";
}

/** ¿La URL trae una búsqueda o un filtro? (Por defecto el listado muestra los activos.) */
export function isFilteredList(filters: FighterFilters): boolean {
  return Boolean(filters.q || filters.division || filters.nationality || filters.gender || filters.status !== "active");
}

/** Canónica del listado: una búsqueda o un filtro es el mismo listado visto de otra forma (`/boxeadores`); solo la página cuenta. */
export function fightersCanonicalPath(filters: FighterFilters, page: number): string {
  return isFilteredList(filters) ? "/boxeadores" : fightersHref(filters, page);
}

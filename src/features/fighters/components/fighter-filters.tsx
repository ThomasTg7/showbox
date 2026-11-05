"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type FormEvent } from "react";
import { fightersHref, parsePublicFilters } from "../public-filters";
import type { FighterFilters as Filters } from "../schema";

type FighterFiltersProps = {
  filters: Filters;
  divisions: { slug: string; name: string; gender: "male" | "female" }[];
  /** Nombres de país armados en el servidor (`Intl` difiere entre Node y el navegador). */
  countries: { code: string; name: string }[];
};

const controlClass =
  "h-11 w-full min-w-0 border border-border bg-surface px-3 font-cond text-[15px] font-semibold uppercase tracking-[.05em] text-white outline-none transition-opacity placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-accent-bright/50 [&>option]:bg-black";
const labelClass = "flex flex-col gap-1.5 font-cond text-[12px] font-extrabold uppercase tracking-[.16em] text-muted-foreground";

/**
 * Filtros en la URL. Sin JavaScript funciona como un formulario GET normal; con JavaScript se aplican al cambiar
 * cada campo (la búsqueda espera a que se deje de escribir).
 */
export function FighterFilters({ filters, divisions, countries }: FighterFiltersProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isPending, startTransition] = useTransition();

  useEffect(() => () => clearTimeout(timer.current), []);

  // Los campos no son controlados: si la URL cambia por otro camino («Ver todos», «Atrás»), se alinean con ella.
  // El campo que se está usando no se toca, para no pisar lo que se escribe mientras llega la respuesta.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const expected: Record<string, string> = {
      q: filters.q ?? "",
      division: filters.division ?? "",
      pais: filters.nationality ?? "",
      genero: filters.gender ?? "",
      estado: filters.status ?? "all",
    };
    for (const [name, value] of Object.entries(expected)) {
      const field = form.elements.namedItem(name);
      if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement) && field !== document.activeElement) {
        field.value = value;
      }
    }
  }, [filters]);

  function apply() {
    const form = formRef.current;
    if (!form) return;
    const params = Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]));
    startTransition(() => router.replace(fightersHref(parsePublicFilters(params).filters, 1), { scroll: false }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearTimeout(timer.current);
    apply();
  }

  const byGender = (gender: "male" | "female") => divisions.filter((division) => division.gender === gender);

  return (
    <form
      ref={formRef}
      action="/boxeadores"
      method="get"
      role="search"
      aria-label="Buscar boxeadores"
      onSubmit={handleSubmit}
      onChange={(event) => {
        if ((event.target as HTMLElement).getAttribute("name") === "q") {
          clearTimeout(timer.current);
          timer.current = setTimeout(apply, 350);
        } else {
          apply();
        }
      }}
      className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
      aria-busy={isPending}
    >
      <label className={`${labelClass} col-span-2 md:col-span-4 lg:col-span-1`}>
        Buscar
        <span className="relative block">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" name="q" defaultValue={filters.q} placeholder="Nombre o apodo" autoComplete="off" className={`${controlClass} pl-9`} />
        </span>
      </label>
      <label className={labelClass}>
        División
        <select name="division" defaultValue={filters.division ?? ""} className={controlClass}>
          <option value="">Todas</option>
          <optgroup label="Masculinas">
            {byGender("male").map((division) => (
              <option key={division.slug} value={division.slug}>
                {division.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Femeninas">
            {byGender("female").map((division) => (
              <option key={division.slug} value={division.slug}>
                {division.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className={labelClass}>
        País
        <select name="pais" defaultValue={filters.nationality ?? ""} className={controlClass}>
          <option value="">Todos</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Género
        <select name="genero" defaultValue={filters.gender ?? ""} className={controlClass}>
          <option value="">Todos</option>
          <option value="male">Masculino</option>
          <option value="female">Femenino</option>
        </select>
      </label>
      <label className={labelClass}>
        Estado
        <select name="estado" defaultValue={filters.status ?? "all"} className={controlClass}>
          <option value="active">Activos</option>
          <option value="retired">Retirados</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </select>
      </label>
      {/* Sin JavaScript no hay cambio automático: el botón aplica los filtros. Con JavaScript queda oculto. */}
      <noscript>
        <button type="submit" className="col-span-2 h-11 bg-brand px-6 font-cond font-extrabold uppercase tracking-[.08em] text-white">
          Filtrar
        </button>
      </noscript>
    </form>
  );
}

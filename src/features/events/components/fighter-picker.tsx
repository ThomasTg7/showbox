"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { FormField } from "@/components/admin/form-field";
import { Flag } from "@/components/ui-gc/flag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchFightersForBoutAction, type FighterSearchResult } from "../card-actions";

export type PickedFighter = { id: string; label: string; /** Nombre sin apodo y país: los rankings los necesitan al agregar al borrador. */ name?: string; nationality?: string };

type FighterPickerProps = {
  label: string;
  /** Color del borde de la esquina; sin él (rankings) el borde es neutro. */
  corner?: "red" | "blue";
  value: PickedFighter | null;
  onChange: (value: PickedFighter | null) => void;
  /** Boxeadores que no se pueden elegir (p. ej. ya tienen otra pelea en el evento): se muestran con `busyLabel`. */
  busyIds: string[];
  error?: string;
  /** Quién busca: por defecto cualquier boxeador (cartelera); los rankings pasan un buscador de elegibles. */
  search?: (query: string) => Promise<FighterSearchResult[]>;
  busyLabel?: string;
  emptyText?: string;
};

const SEARCH_DELAY_MS = 250;
const CORNER_COLOR = { red: "border-l-[#D7263D]", blue: "border-l-[#1E6FD9]" } as const;
const DEFAULT_EMPTY_TEXT = "Ningún boxeador coincide. Créalo antes en Boxeadores.";

/** Buscador de boxeadores por nombre o apodo: pide a lo más 10 resultados al servidor, nunca la lista completa. */
export function FighterPicker({ label, corner, value, onChange, busyIds, error, search = searchFightersForBoutAction, busyLabel = "Ya está en la cartelera", emptyText = DEFAULT_EMPTY_TEXT }: FighterPickerProps) {
  const uid = useId();
  const [query, setQuery] = useState("");
  // Lo encontrado se guarda con el texto que lo pidió: solo se muestra si sigue siendo el texto actual.
  const [found, setFound] = useState<{ text: string; items: FighterSearchResult[] } | null>(null);
  const text = query.trim();
  const results = text.length >= 2 && found?.text === text ? found.items : null;

  useEffect(() => {
    if (text.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const items = await search(text);
      if (!stale) setFound({ text, items });
    }, SEARCH_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [text, search]);

  if (value) {
    return (
      <FormField id={`${uid}-picked`} label={label} error={error}>
        <div className={`flex min-h-11 items-center justify-between gap-2 border border-border bg-card px-3 ${corner ? `border-l-4 ${CORNER_COLOR[corner]}` : ""}`}>
          <span id={`${uid}-picked`} className="font-medium break-words">
            {value.label}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} aria-label={`Cambiar ${label.toLowerCase()}`}>
            <X aria-hidden /> Cambiar
          </Button>
        </div>
      </FormField>
    );
  }

  return (
    <FormField id={`${uid}-search`} label={label} error={error} hint="Escribe al menos 2 letras del nombre, apellido o apodo.">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${uid}-search`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          className="pl-8"
          placeholder="Buscar boxeador"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-controls={`${uid}-results`}
        />
      </div>
      <div id={`${uid}-results`} role="status" aria-live="polite">
        {results === null ? null : results.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="mt-1 flex flex-col border border-border">
            {results.map((fighter) => {
              const busy = busyIds.includes(fighter.id);
              return (
                <li key={fighter.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onChange({ id: fighter.id, label: fighter.nickname ? `${fighter.name} «${fighter.nickname}»` : fighter.name, name: fighter.name, nationality: fighter.nationality });
                      setQuery("");
                    }}
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Flag code={fighter.nationality} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium break-words">
                        {fighter.name}
                        {fighter.nickname ? <span className="font-normal text-muted-foreground"> «{fighter.nickname}»</span> : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {fighter.divisionName}
                        {fighter.status === "draft" ? " · Borrador" : ""}
                        {fighter.careerStatus === "active" ? "" : fighter.careerStatus === "retired" ? " · Retirado" : " · Inactivo"}
                        {busy ? ` · ${busyLabel}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FormField>
  );
}

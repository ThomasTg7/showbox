"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RelatedItemDTO } from "../dto";

export type RelatedOption = { id: string; label: string; hint?: string };

type RelatedPickerProps = {
  /** Nombre del campo: se envía un valor por elemento elegido. */
  name: string;
  label: string;
  hint: string;
  placeholder: string;
  initial: RelatedItemDTO[];
  /** Pide al servidor hasta 10 resultados; nunca se trae la lista completa al navegador. */
  search: (query: string) => Promise<RelatedOption[]>;
  /** Lo que se dice de un elemento que hoy no se vería en el sitio (borrador o papelera). */
  hiddenNote: string;
};

const SEARCH_DELAY_MS = 250;

/** Elegidos como etiquetas removibles de 44 px, con buscador por nombre. */
export function RelatedPicker({ name, label, hint, placeholder, initial, search, hiddenNote }: RelatedPickerProps) {
  const uid = useId();
  const [selected, setSelected] = useState<RelatedItemDTO[]>(initial);
  const [query, setQuery] = useState("");
  // Lo encontrado se guarda con el texto que lo pidió: solo se muestra si sigue siendo el texto actual.
  const [found, setFound] = useState<{ text: string; items: RelatedOption[] } | null>(null);
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

  function add(option: RelatedOption) {
    setSelected((current) => (current.some((item) => item.id === option.id) ? current : [...current, { id: option.id, label: option.label, isPublic: true }]));
    setQuery("");
  }

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">{label}</h3>
      {selected.map((item) => (
        <input key={item.id} type="hidden" name={name} value={item.id} />
      ))}

      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <li key={item.id} className="flex min-h-11 items-center gap-1 border border-border bg-card pl-3">
              <span className="min-w-0 break-words">
                {item.label}
                {item.isPublic ? null : <span className="block text-xs text-muted-foreground">{hiddenNote}</span>}
              </span>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar a ${item.label}`} onClick={() => setSelected((current) => current.filter((other) => other.id !== item.id))}>
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`${uid}-search`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          className="pl-8"
          placeholder={placeholder}
          aria-label={`Buscar ${label.toLowerCase()}`}
          autoComplete="off"
          aria-controls={`${uid}-results`}
        />
      </div>
      <div id={`${uid}-results`} role="status" aria-live="polite">
        {results === null ? null : results.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nada coincide con «{text}».</p>
        ) : (
          <ul className="flex flex-col border border-border">
            {results.map((option) => {
              const already = selected.some((item) => item.id === option.id);
              return (
                <li key={option.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => add(option)}
                    className="flex min-h-11 w-full flex-col items-start justify-center px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="font-medium break-words">{option.label}</span>
                    {option.hint || already ? <span className="text-xs text-muted-foreground">{already ? "Ya está agregado" : option.hint}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

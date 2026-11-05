"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { formFieldErrorId } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FAQ_ITEMS } from "../registry";

type Row = { key: number; q: string; a: string };

type FaqFieldProps = { initial: { q: string; a: string }[]; error?: string };

/** Lista editable de preguntas y respuestas de `/entradas`. Subir/bajar en vez de arrastrar: funciona igual en celular y teclado. */
export function FaqField({ initial, error }: FaqFieldProps) {
  const id = useId();
  const [nextKey, setNextKey] = useState(initial.length);
  const [rows, setRows] = useState<Row[]>(() => initial.map((item, index) => ({ key: index, ...item })));

  function update(key: number, field: "q" | "a", value: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function move(index: number, offset: -1 | 1) {
    setRows((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function add() {
    setRows((current) => [...current, { key: nextKey, q: "", a: "" }]);
    setNextKey((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-4" aria-describedby={error ? formFieldErrorId(id) : undefined}>
      {rows.length === 0 ? (
        <p className="border border-dashed border-border p-4 text-muted-foreground">Aún no hay preguntas. Mientras no agregues ninguna, la sección no aparece en Entradas.</p>
      ) : null}
      <ol className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <li key={row.key} className="flex flex-col gap-3 border border-border p-3 sm:p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-q-${row.key}`}>Pregunta {index + 1}</Label>
              <Input id={`${id}-q-${row.key}`} name="q" value={row.q} maxLength={200} onChange={(event) => update(row.key, "q", event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-a-${row.key}`}>Respuesta {index + 1}</Label>
              <Textarea id={`${id}-a-${row.key}`} name="a" value={row.a} rows={3} maxLength={2000} onChange={(event) => update(row.key, "a", event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" aria-label={`Subir la pregunta ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp aria-hidden /> Subir
              </Button>
              <Button type="button" variant="outline" aria-label={`Bajar la pregunta ${index + 1}`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown aria-hidden /> Bajar
              </Button>
              <Button type="button" variant="outline" aria-label={`Quitar la pregunta ${index + 1}`} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>
                <Trash2 aria-hidden /> Quitar
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {error ? (
        <p id={formFieldErrorId(id)} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="button" variant="outline" disabled={rows.length >= MAX_FAQ_ITEMS} onClick={add}>
          <Plus aria-hidden /> Agregar pregunta
        </Button>
      </div>
    </div>
  );
}

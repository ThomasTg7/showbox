"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { MoneyInput } from "@/components/admin/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { TicketTier } from "@/db/schema/events";
import { formatThousands, parseThousands } from "@/lib/format-money";

type TierDraft = { key: number; name: string; description: string; price: string; soldOut: boolean };

type TicketTiersFieldProps = {
  /** Los tramos ya guardados, en orden. */
  initial: TicketTier[];
  /** Error del servidor sobre los tramos (formato o cantidad). */
  error?: string;
};

const MAX_TIERS = 12;

/** Tramos de precio de las entradas (nombre, descripción, precio en pesos, agotado). Envía todo junto como JSON en `ticketTiers`. */
export function TicketTiersField({ initial, error }: TicketTiersFieldProps) {
  const uid = useId();
  const [tiers, setTiers] = useState<TierDraft[]>(() =>
    initial.map((tier, index) => ({ key: index, name: tier.name, description: tier.description, price: formatThousands(String(tier.priceClp)), soldOut: tier.soldOut })),
  );
  const [nextKey, setNextKey] = useState(initial.length);

  const update = (key: number, changes: Partial<TierDraft>) => setTiers((current) => current.map((tier) => (tier.key === key ? { ...tier, ...changes } : tier)));
  const move = (index: number, delta: -1 | 1) =>
    setTiers((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
      return next;
    });

  const serialized = JSON.stringify(tiers.map((tier) => ({ name: tier.name, description: tier.description, priceClp: parseThousands(tier.price), soldOut: tier.soldOut })));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Tramos de entradas</legend>
      <input type="hidden" name="ticketTiers" value={serialized} />
      {tiers.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay tramos. Agrega General, Preferencial u otros con su precio.</p> : null}
      <ul className="flex flex-col gap-3">
        {tiers.map((tier, index) => (
          <li key={tier.key} className="flex flex-col gap-3 border border-border bg-card p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_9rem]">
              <label className="flex flex-col gap-1 text-sm" htmlFor={`${uid}-name-${tier.key}`}>
                Nombre del tramo
                <Input id={`${uid}-name-${tier.key}`} value={tier.name} maxLength={60} onChange={(event) => update(tier.key, { name: event.target.value })} placeholder="General" autoComplete="off" />
              </label>
              <label className="flex flex-col gap-1 text-sm" htmlFor={`${uid}-description-${tier.key}`}>
                Descripción
                <Input id={`${uid}-description-${tier.key}`} value={tier.description} maxLength={120} onChange={(event) => update(tier.key, { description: event.target.value })} placeholder="Galería · Acceso 19:30" autoComplete="off" />
              </label>
              <label className="flex flex-col gap-1 text-sm" htmlFor={`${uid}-price-${tier.key}`}>
                Precio (USD)
                <MoneyInput id={`${uid}-price-${tier.key}`} value={tier.price} onChange={(price) => update(tier.key, { price })} placeholder="15.000" />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* La etiqueta entera es el área táctil (44 px): el interruptor solo mide 18. */}
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <Switch checked={tier.soldOut} onCheckedChange={(soldOut) => update(tier.key, { soldOut })} aria-label={`Agotado: ${tier.name || `tramo ${index + 1}`}`} />
                Agotado
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon" disabled={index === 0} aria-label={`Subir el tramo ${tier.name || index + 1}`} onClick={() => move(index, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" variant="outline" size="icon" disabled={index === tiers.length - 1} aria-label={`Bajar el tramo ${tier.name || index + 1}`} onClick={() => move(index, 1)}>
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label={`Quitar el tramo ${tier.name || index + 1}`} onClick={() => setTiers((current) => current.filter((other) => other.key !== tier.key))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={tiers.length >= MAX_TIERS}
          onClick={() => {
            setTiers((current) => [...current, { key: nextKey, name: "", description: "", price: "", soldOut: false }]);
            setNextKey(nextKey + 1);
          }}
        >
          <Plus aria-hidden /> Agregar tramo
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

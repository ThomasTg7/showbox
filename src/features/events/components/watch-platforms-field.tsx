"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaField } from "@/features/media/components/media-field";
import type { WatchPlatformDTO } from "../dto";
import { watchPlatformSchema } from "../watch-schema";

type Draft = WatchPlatformDTO & { key: number };

export function WatchPlatformsField({ initial = [], error }: { initial?: WatchPlatformDTO[]; error?: string }) {
  const uid = useId();
  const [platforms, setPlatforms] = useState<Draft[]>(() => initial.map((platform, key) => ({ ...platform, key })));
  const [nextKey, setNextKey] = useState(initial.length);
  const update = (key: number, changes: Partial<WatchPlatformDTO>) => setPlatforms((current) => current.map((platform) => platform.key === key ? { ...platform, ...changes } : platform));
  const move = (index: number, delta: number) => setPlatforms((current) => {
    const next = [...current];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    return next;
  });
  const value = JSON.stringify(platforms.map(({ name, url, media }) => ({ name, url, mediaId: media?.id ?? null })));

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-base font-semibold">Dónde ver este evento</legend>
      <p className="text-sm text-muted-foreground">Agrega las plataformas que mostrarán este evento. El público podrá elegir una al tocar «Ver».</p>
      <input type="hidden" name="watchPlatforms" value={value} />
      {!platforms.length ? <p className="border border-dashed p-4 text-sm text-muted-foreground">Aún no hay plataformas. Agrega una cuando tengas el enlace de la transmisión.</p> : null}
      {platforms.map((platform, index) => {
        const parsed = error ? watchPlatformSchema.safeParse({ ...platform, mediaId: platform.media?.id ?? null }) : null;
        const issues = parsed && !parsed.success ? parsed.error.issues : [];
        return (
          <fieldset key={platform.key} className="flex min-w-0 flex-col gap-4 border border-border bg-card p-4">
            <legend className="px-1 text-sm font-semibold">Plataforma {index + 1}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["name", "url"] as const).map((field) => {
                const message = issues.find((issue) => issue.path[0] === field)?.message;
                const id = `${uid}-${platform.key}-${field}`;
                return <div key={field} className="flex flex-col gap-1">
                  <label htmlFor={id} className="text-sm font-medium">{field === "name" ? "Nombre de la plataforma" : "Enlace para ver"} {index + 1}</label>
                  <Input id={id} type={field === "url" ? "url" : "text"} value={platform[field]} maxLength={field === "name" ? 80 : 2048} onChange={(event) => update(platform.key, { [field]: event.target.value })} aria-invalid={Boolean(message)} aria-describedby={message ? `${id}-error` : undefined} placeholder={field === "name" ? "YouTube" : "https://…"} />
                  {message ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{message}</p> : null}
                </div>;
              })}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Imagen de la plataforma (opcional)</p>
              <MediaField kind="sponsor_logo" label="imagen de la plataforma" name={`watchPlatformImage-${platform.key}`} media={platform.media} onChange={(_id, media) => update(platform.key, { media })} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="min-h-11 min-w-11" disabled={!index} aria-label={`Subir plataforma ${index + 1}`} onClick={() => move(index, -1)}><ArrowUp aria-hidden /></Button>
              <Button type="button" variant="outline" className="min-h-11 min-w-11" disabled={index === platforms.length - 1} aria-label={`Bajar plataforma ${index + 1}`} onClick={() => move(index, 1)}><ArrowDown aria-hidden /></Button>
              <Button type="button" variant="outline" className="min-h-11" aria-label={`Quitar plataforma ${index + 1}`} onClick={() => setPlatforms((current) => current.filter((other) => other.key !== platform.key))}><Trash2 aria-hidden /> Quitar</Button>
            </div>
          </fieldset>
        );
      })}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" variant="outline" className="min-h-11 self-start" disabled={platforms.length >= 12} onClick={() => {
        setPlatforms((current) => [...current, { key: nextKey, name: "", url: "", media: null }]);
        setNextKey(nextKey + 1);
      }}><Plus aria-hidden /> Agregar plataforma</Button>
    </fieldset>
  );
}

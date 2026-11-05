"use client";

import { useState } from "react";
import { SelectField, TextAreaField, TextField } from "@/components/admin/form-fields";
import { Switch } from "@/components/ui/switch";
import { MEDIA_SPECS } from "@/domain/media-specs";
import { MediaField } from "@/features/media/components/media-field";
import { MediaGalleryField } from "@/features/media/components/media-gallery-field";
import type { MediaDTO } from "@/features/media/dto";
import { searchFightersForBoutAction } from "@/features/events/card-actions";
import { searchEventsForPostAction } from "../actions";
import type { PostCategoryDTO, RelatedItemDTO } from "../dto";
import { RelatedPicker, type RelatedOption } from "./related-picker";

type DataTabProps = {
  categories: PostCategoryDTO[];
  cover: MediaDTO | null;
  featured: boolean;
  showSlug: boolean;
  onCoverChange?: (cover: MediaDTO | null) => void;
};

/** Título, categoría, bajada, portada y si es la noticia destacada de la home. El enlace solo se edita en noticias ya creadas. */
export function PostDataTab({ categories, cover, featured: initialFeatured, showSlug, onCoverChange }: DataTabProps) {
  const [featured, setFeatured] = useState(initialFeatured);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          name="title"
          label="Título"
          maxLength={140}
          autoComplete="off"
          help="El titular grande de la noticia: corto y con lo más importante. Ej.: «Pérez retiene el cinturón por KO en el segundo round». Si usas «Con IA», se llena solo."
        />
      </div>
      <SelectField name="categoryId" label="Categoría">
        <option value="">Elige una categoría</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>
      {showSlug ? (
        <TextField
          name="slug"
          label="Enlace de la noticia"
          hint="Al cambiar el título el enlace no cambia. Cámbialo solo si es necesario: los enlaces ya compartidos dejarían de funcionar."
          autoComplete="off"
          autoCapitalize="none"
        />
      ) : null}
      <div className="md:col-span-2">
        <TextAreaField
          name="excerpt"
          label="Bajada"
          rows={3}
          maxLength={300}
          hint="Una o dos frases que resumen la noticia. Se ve en las tarjetas y bajo el título."
          help="Aparece bajo el título y en las tarjetas del inicio y del listado. Cuenta en una o dos frases qué pasó, sin repetir el título. Si usas «Con IA», se llena sola."
        />
      </div>
      <div className="md:col-span-2">
        {/* La etiqueta entera es el área táctil (44 px): el interruptor solo mide 18. */}
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <Switch checked={featured} onCheckedChange={setFeatured} />
          <span className="flex flex-col">
            <span className="font-medium">Noticia destacada</span>
            <span className="text-xs text-muted-foreground">La destacada más reciente es la principal de la página de inicio.</span>
          </span>
        </label>
        {featured ? <input type="hidden" name="featured" value="on" /> : null}
      </div>
      <section className="flex flex-col gap-2 md:col-span-2">
        <h3 className="text-base font-semibold">{MEDIA_SPECS.news_cover.label}</h3>
        <p className="text-sm text-muted-foreground">Sin portada, la noticia usa un fondo de la marca.</p>
        <MediaField kind="news_cover" name="coverMediaId" media={cover} onChange={(_, media) => onCoverChange?.(media)} />
      </section>
    </div>
  );
}

export function PostGalleryTab({ gallery, onGalleryChange }: { gallery: MediaDTO[]; onGalleryChange?: (media: MediaDTO[]) => void }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">Galería de la noticia</h3>
      <p className="text-sm text-muted-foreground">Fotos que se muestran al final de la noticia, con visor. Se pueden ordenar.</p>
      <MediaGalleryField name="galleryMediaIds" media={gallery} onMediaChange={onGalleryChange} />
    </section>
  );
}

// Funciones fuera del componente: el buscador no se recrea en cada render.
async function searchFighters(query: string): Promise<RelatedOption[]> {
  const found = await searchFightersForBoutAction(query);
  return found.map((fighter) => ({
    id: fighter.id,
    label: fighter.nickname ? `${fighter.name} «${fighter.nickname}»` : fighter.name,
    hint: fighter.status === "published" ? fighter.divisionName : `${fighter.divisionName} · No es público todavía`,
  }));
}

async function searchEvents(query: string): Promise<RelatedOption[]> {
  const found = await searchEventsForPostAction(query);
  return found.map((event) => ({ id: event.id, label: event.name, hint: event.status === "published" ? undefined : "No es público todavía" }));
}

type RelatedTabProps = { fighters: RelatedItemDTO[]; events: RelatedItemDTO[]; error?: string };

export function PostRelatedTab({ fighters, events, error }: RelatedTabProps) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        La noticia aparece en la ficha de cada boxeador y en la página de cada evento que elijas. Uno que no sea público (borrador o en la papelera) no se muestra.
      </p>
      <RelatedPicker
        name="fighterIds"
        label="Boxeadores relacionados"
        hint="Aún no hay boxeadores. Busca por nombre o apodo."
        placeholder="Buscar boxeador"
        initial={fighters}
        search={searchFighters}
        hiddenNote="No se ve en el sitio (borrador o papelera)"
      />
      <RelatedPicker
        name="eventIds"
        label="Eventos relacionados"
        hint="Aún no hay eventos. Busca por nombre."
        placeholder="Buscar evento"
        initial={events}
        search={searchEvents}
        hiddenNote="No se ve en el sitio (borrador o papelera)"
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";
import { BRAND } from "@/domain/brand";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { SelectField, TextAreaField, TextField } from "@/components/admin/form-fields";
import { EVENT_STATUS_LABELS } from "@/domain/bout-enums";
import { MEDIA_SPECS } from "@/domain/media-specs";
import type { TicketTier } from "@/db/schema/events";
import type { MediaDTO } from "@/features/media/dto";
import { MediaField } from "@/features/media/components/media-field";
import { MediaGalleryField } from "@/features/media/components/media-gallery-field";
import { TicketTiersField } from "./ticket-tiers-field";

/** Nombre, número y estado del evento. El enlace solo se edita en eventos ya creados. */
export function EventDataTab({ showSlug, isLive }: { showSlug: boolean; isLive: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField name="name" label="Nombre del evento" hint={`Ej.: ${BRAND.name} 5`} autoComplete="off" />
      <TextField name="number" label="Número (opcional)" inputMode="numeric" autoComplete="off" />
      <SelectField
        name="eventStatus"
        label="Estado del evento"
        hint="«En vivo» y «Finalizado» se ponen solos desde Noche de pelea; aquí puedes cancelar el evento o volver a programarlo."
      >
        <option value="scheduled">{EVENT_STATUS_LABELS.scheduled}</option>
        <option value="cancelled">{EVENT_STATUS_LABELS.cancelled}</option>
        <option value="completed">{EVENT_STATUS_LABELS.completed}</option>
        {isLive ? <option value="live">{EVENT_STATUS_LABELS.live}</option> : null}
      </SelectField>
      {showSlug ? (
        <TextField
          name="slug"
          label="Enlace del evento"
          hint="Al renombrar el evento el enlace no cambia. Cámbialo solo si es necesario: los enlaces ya compartidos dejarían de funcionar."
          autoComplete="off"
          autoCapitalize="none"
        />
      ) : null}
    </div>
  );
}

/** Fecha y hora de inicio (hora de Ecuador), puertas, término estimado y recinto. */
export function EventPlaceTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField name="startsDate" label="Fecha del evento" type="date" />
      <TextField name="startsTime" label="Hora de inicio" type="time" hint="Hora de Ecuador." />
      <TextField name="doorsTime" label="Apertura de puertas (opcional)" type="time" />
      <TextField name="endsTime" label="Término estimado (opcional)" type="time" hint="Si es después de medianoche, se toma como el día siguiente." />
      <TextField name="venueName" label="Recinto" hint="Ej.: Quorum Paseo San Francisco" autoComplete="off" />
      <TextField name="venueCity" label="Ciudad" autoComplete="off" />
      <div className="md:col-span-2">
        <TextField name="venueAddress" label="Dirección" autoComplete="off" />
      </div>
      <div className="md:col-span-2">
        <TextField
          name="mapsUrl"
          label="Enlace de Google Maps (opcional)"
          hint="En Google Maps busca el recinto, toca «Compartir», copia el enlace y pégalo aquí. Con él se muestra el mapa en la página del evento."
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
        />
      </div>
    </div>
  );
}

type EventImagesTabProps = { heroMedia: MediaDTO | null; heroMobileMedia: MediaDTO | null; posterMedia: MediaDTO | null; gallery: MediaDTO[] };

export function EventImagesTab({ heroMedia, heroMobileMedia, posterMedia, gallery }: EventImagesTabProps) {
  const [images, setImages] = useState({ mobile: heroMobileMedia, poster: posterMedia });
  const [reused, setReused] = useState(false);
  function select(target: "mobile" | "poster", media: MediaDTO | null) {
    setImages((current) => ({
      ...current,
      [target]: media,
      ...(media && current.mobile?.id === media.id ? { mobile: media } : {}),
      ...(media && current.poster?.id === media.id ? { poster: media } : {}),
    }));
  }
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{MEDIA_SPECS.event_hero.label}</h3>
          <p className="text-sm text-muted-foreground">Es la imagen grande de la página del evento en computador.</p>
          <MediaField kind="event_hero" name="heroMediaId" media={heroMedia} />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{MEDIA_SPECS.event_hero_mobile.label}</h3>
          <p className="text-sm text-muted-foreground">Se usa directamente en celular, incluso sin portada de computador. Si falta, se usa la horizontal. Ajusta el punto de enfoque para el encuadre a pantalla completa.</p>
          <MediaField kind="event_hero_mobile" name="heroMobileMediaId" value={images.mobile} onChange={(_id, media) => select("mobile", media)} />
          <Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={!images.poster} onClick={() => { select("mobile", images.poster); setReused(true); }}>Usar el afiche como portada móvil</Button>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{MEDIA_SPECS.event_poster.label}</h3>
          <p className="text-sm text-muted-foreground">Aparece en los listados de eventos.</p>
          <MediaField kind="event_poster" name="posterMediaId" value={images.poster} onChange={(_id, media) => select("poster", media)} />
          <Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={!images.mobile} onClick={() => { select("poster", images.mobile); setReused(true); }}>Usar la portada móvil como afiche</Button>
        </section>
      </div>
      {reused ? <p role="status" className="text-sm text-muted-foreground">Imagen reutilizada. Guarda los cambios para aplicarla al evento.</p> : null}
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Galería del evento</h3>
        <p className="text-sm text-muted-foreground">Fotos del evento (se pueden ordenar). Se muestran en la página pública, sobre todo después de la velada.</p>
        <MediaGalleryField name="galleryMediaIds" media={gallery} />
      </section>
    </div>
  );
}

type EventTicketsTabProps = { tiers: TicketTier[]; tiersError?: string };

export function EventTicketsTab({ tiers, tiersError }: EventTicketsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="ticketUrl" label="Enlace de la ticketera" type="url" inputMode="url" hint="Donde se compran las entradas (https://…)." autoComplete="off" />
        <TextField name="ticketProvider" label="Nombre de la ticketera" hint="Ej.: Ticketmaster" autoComplete="off" />
      </div>
      <TicketTiersField initial={tiers} error={tiersError} />
      <TextAreaField name="ticketPoints" label="Puntos de venta" rows={3} maxLength={600} hint="Dónde comprar sin ticketera: boletería, tienda, etc." />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaDTO } from "../dto";

type MediaGalleryFieldProps = {
  /** Nombre del campo: se envía un valor por foto, en el orden mostrado. */
  name: string;
  /** Fotos ya guardadas, en orden (las carga el servidor con `getMediaByIds`). */
  media?: MediaDTO[];
  onChange?: (mediaIds: string[]) => void;
  /** Igual que `onChange`, con las fotos completas. */
  onMediaChange?: (media: MediaDTO[]) => void;
};

// dnd-kit solo se descarga en los formularios que tienen galería.
const GalleryEditor = dynamic(() => import("./gallery-editor").then((module) => module.GalleryEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />,
});

export function MediaGalleryField({ name, media = [], onChange, onMediaChange }: MediaGalleryFieldProps) {
  // Los valores del formulario viven aquí (no en el editor diferido): si se envía el formulario
  // antes de que cargue el editor, las fotos actuales se conservan.
  const [ids, setIds] = useState(() => media.map((item) => item.id));

  const handleChange = useCallback(
    (next: string[]) => {
      setIds(next);
      onChange?.(next);
    },
    [onChange],
  );

  return (
    <>
      {ids.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <GalleryEditor media={media} onChange={handleChange} onMediaChange={onMediaChange} />
    </>
  );
}

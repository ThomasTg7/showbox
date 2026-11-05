"use client";

import { ImageOff } from "lucide-react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaDTO } from "@/features/media/dto";
import { WizardStep } from "./wizard-step";

// dnd-kit (orden de las fotos) solo se descarga al abrir «Con IA».
const GalleryEditor = dynamic(() => import("@/features/media/components/gallery-editor").then((module) => module.GalleryEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-32 w-full" />,
});

const UPLOAD_LABELS = { empty: "Subir fotos para la noticia", more: "Agregar más fotos" };

type AiPhotosStepProps = {
  photos: MediaDTO[];
  /** Cambia cuando cambian las fotos que ya estaban en el texto (vuelve a montar la galería con ellas). */
  galleryKey: string;
  onPhotosChange: (photos: MediaDTO[]) => void;
  descriptions: Record<string, string>;
  onDescriptionChange: (mediaId: string, description: string) => void;
};

/** Paso 1: subir las fotos y contar qué muestra cada una (la IA no las ve). */
export function AiPhotosStep({ photos, galleryKey, onPhotosChange, descriptions, onDescriptionChange }: AiPhotosStepProps) {
  return (
    <WizardStep
      number={1}
      title="Sube las fotos (opcional)"
      help={
        <>
          <p>Las fotos de la noticia las subes tú aquí. Cada una queda con un número: FOTO 1, FOTO 2…</p>
          <p>Debajo de cada foto escribe qué muestra. Eso se copia junto con las instrucciones y la IA decide dónde ubicarla en el texto.</p>
          <p>La foto de portada se elige aparte, en la pestaña «Datos».</p>
        </>
      }
    >
      <div className="flex gap-3 border border-primary/50 bg-primary/10 p-3 text-sm">
        <ImageOff aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-bright" />
        <p>
          <strong>La IA no puede ver, crear ni subir fotos.</strong> Súbelas tú aquí y, debajo de cada una, cuenta qué muestra. La IA solo decide en qué
          parte del texto va cada una.
        </p>
      </div>
      <GalleryEditor
        key={galleryKey}
        media={photos}
        onMediaChange={onPhotosChange}
        uploadLabels={UPLOAD_LABELS}
        numbered
        renderItemExtra={(item, index) => (
          <Input
            value={descriptions[item.id] ?? ""}
            onChange={(event) => onDescriptionChange(item.id, event.target.value)}
            aria-label={`¿Qué muestra la foto ${index + 1}?`}
            placeholder={`FOTO ${index + 1}: ¿qué muestra? Ej.: Pérez levantando el cinturón`}
            maxLength={200}
            className="text-sm"
          />
        )}
      />
    </WizardStep>
  );
}

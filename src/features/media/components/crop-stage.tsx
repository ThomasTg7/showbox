"use client";

import { RotateCcw, RotateCw } from "lucide-react";
import { useRef } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Crop } from "@/domain/media-specs";
import { RangeField } from "./range-field";
import { useRemeasureAfterOpen } from "./use-remeasure-after-open";

const FREE_ASPECTS = [
  { value: "original", label: "Original" },
  { value: "1", label: "1:1 (cuadrada)" },
  { value: "1.5", label: "3:2" },
  { value: "1.3333333", label: "4:3" },
  { value: "1.7777778", label: "16:9" },
  { value: "0.8", label: "4:5 (vertical)" },
] as const;

/** Proporción de la lista que corresponde a un recorte guardado, para reabrirlo igual ("original" si no calza con ninguna). */
export function aspectChoiceFor(crop: Crop | null | undefined): string {
  if (!crop) return "original";
  const ratio = crop.width / crop.height;
  const match = FREE_ASPECTS.find((option) => option.value !== "original" && Math.abs(Number(option.value) - ratio) < 0.01);
  return match?.value ?? "original";
}

type CropStageProps = {
  src: string;
  aspect: number;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  filter: string;
  initialPixels: Crop | null;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (pixels: Crop) => void;
};

/** Zona de recorte: llena el contenedor que la envuelve (el editor le da la altura). */
export function CropStage(props: CropStageProps) {
  const cropperRef = useRef<Cropper>(null);
  useRemeasureAfterOpen(cropperRef);
  return (
    <Cropper
      ref={cropperRef}
      image={props.src}
      crop={props.crop}
      zoom={props.zoom}
      rotation={props.rotation}
      aspect={props.aspect}
      minZoom={1}
      maxZoom={3}
      initialCroppedAreaPixels={props.initialPixels ?? undefined}
      mediaProps={{ style: { filter: props.filter } }}
      style={{ containerStyle: { background: "transparent" } }}
      onCropChange={props.onCropChange}
      onZoomChange={props.onZoomChange}
      onCropComplete={(_area, pixels) => props.onCropComplete(pixels)}
    />
  );
}

type CropToolsProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onRotate: (delta: 90 | -90) => void;
  /** Solo los tipos de proporción libre permiten elegir otra. */
  freeAspect: boolean;
  aspectChoice: string;
  onAspectChange: (value: string) => void;
};

/** Zoom, giro y proporción: la barra que va justo debajo de la zona de recorte. */
export function CropTools({ zoom, onZoomChange, onRotate, freeAspect, aspectChoice, onAspectChange }: CropToolsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div role="group" aria-label="Girar" className="flex shrink-0 gap-1">
          <Button type="button" variant="outline" size="icon" aria-label="Girar a la izquierda" title="Girar a la izquierda" onClick={() => onRotate(-90)}>
            <RotateCcw aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Girar a la derecha" title="Girar a la derecha" onClick={() => onRotate(90)}>
            <RotateCw aria-hidden />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <RangeField id="crop-zoom" label="Zoom" min={1} max={3} step={0.05} value={zoom} display={`${Math.round(zoom * 100)}%`} onChange={onZoomChange} />
        </div>
      </div>
      {freeAspect ? (
        <div className="flex items-center gap-2">
          <Label htmlFor="crop-aspect" className="shrink-0 text-sm">
            Proporción del recorte
          </Label>
          <select
            id="crop-aspect"
            value={aspectChoice}
            onChange={(event) => onAspectChange(event.target.value)}
            className="h-11 min-w-0 flex-1 border border-input bg-background px-2 text-base md:h-9 md:text-sm"
          >
            {FREE_ASPECTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

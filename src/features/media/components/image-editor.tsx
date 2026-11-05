"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEDIA_SPECS, checkResolution, describeSpec, type Crop, type MediaKind } from "@/domain/media-specs";
import type { MediaEdit } from "../schema";
import { DEFAULT_ADJUSTMENTS } from "../schema";
import { AdjustmentsPanel, SharpenFilter, adjustmentsFilter } from "./adjustments";
import { CHECKERBOARD } from "./checkerboard";
import { CropStage, CropTools, aspectChoiceFor } from "./crop-stage";
import { FocalPicker } from "./focal-picker";
import { ModeSwitch, type EditorMode } from "./mode-switch";
import { PreviewFrames } from "./preview-frames";
import { RemoveBackgroundButton } from "./remove-background-button";
import { useCropPreview } from "./use-crop-preview";

type ImageEditorProps = {
  kind: MediaKind;
  src: string;
  /** Tamaño de la imagen como se ve (con la orientación EXIF ya aplicada). */
  natural: { w: number; h: number };
  initial?: MediaEdit;
  onSave: (edit: MediaEdit) => void;
  onCancel: () => void;
  /** Si se entrega y el tipo es `fighter_body`, aparece "Quitar fondo"; el padre sube el PNG resultante como nuevo original. */
  onBackgroundRemoved?: (cutout: Blob) => void;
};

type Rotation = MediaEdit["rotation"];

/**
 * Editor a pantalla completa dentro de un diálogo. En PC: zona de recorte a la izquierda y panel a la
 * derecha, con el pie siempre visible. En celular: todo en una columna que se desplaza y pie fijo.
 * `--stage-h` es la altura de la zona de recorte (la usan el recorte y el selector de enfoque).
 */
export function ImageEditor({ kind, src, natural, initial, onSave, onCancel, onBackgroundRemoved }: ImageEditorProps) {
  const spec = MEDIA_SPECS[kind];
  const [mode, setMode] = useState<EditorMode>("crop");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<Rotation>(initial?.rotation ?? 0);
  const [aspectChoice, setAspectChoice] = useState(() => aspectChoiceFor(initial?.crop));
  const [pixels, setPixels] = useState<Crop | null>(initial?.crop ?? null);
  const [focal, setFocal] = useState(initial?.focal ?? { x: 0.5, y: 0.5 });
  const [adjustments, setAdjustments] = useState(initial?.adjustments ?? DEFAULT_ADJUSTMENTS);
  const [alt, setAlt] = useState(initial?.alt ?? "");

  const filter = adjustmentsFilter(adjustments);
  const previewSrc = useCropPreview(src, pixels, rotation);
  const resolution = checkResolution(kind, natural.w, natural.h);

  const sideways = rotation === 90 || rotation === 270;
  const originalAspect = sideways ? natural.h / natural.w : natural.w / natural.h;
  const aspect = spec.aspect ?? (aspectChoice === "original" ? originalAspect : Number(aspectChoice));

  function rotate(delta: 90 | -90) {
    setRotation((current) => ((current + delta + 360) % 360) as Rotation);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col [--stage-h:44dvh] lg:[--stage-h:calc(min(92dvh,52rem)-20rem)]">
      <SharpenFilter sharpness={adjustments.sharpness} />

      <div className="flex flex-col gap-2 px-4 pb-3">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{describeSpec(kind)}</span>
        </p>
        {resolution.warning ? (
          <p role="status" className="flex items-start gap-2 border-l-4 border-primary bg-muted p-3 text-sm">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-bright" />
            <span>{resolution.warning}</span>
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="flex flex-col gap-3 p-4 lg:min-h-0 lg:overflow-y-auto">
          <ModeSwitch value={mode} onChange={setMode} />

          <div style={CHECKERBOARD} className="relative h-[var(--stage-h)] shrink-0 overflow-hidden">
            {mode === "crop" ? (
              <CropStage
                src={src}
                aspect={aspect}
                crop={position}
                zoom={zoom}
                rotation={rotation}
                filter={filter}
                initialPixels={pixels}
                onCropChange={setPosition}
                onZoomChange={setZoom}
                onCropComplete={setPixels}
              />
            ) : (
              <FocalPicker
                src={previewSrc}
                aspect={pixels ? pixels.width / pixels.height : aspect}
                focal={focal}
                filter={filter}
                onChange={setFocal}
              />
            )}
          </div>

          {mode === "crop" ? (
            <CropTools
              zoom={zoom}
              onZoomChange={setZoom}
              onRotate={rotate}
              freeAspect={spec.aspect === null}
              aspectChoice={aspectChoice}
              onAspectChange={setAspectChoice}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Toca lo más importante de la foto (por ejemplo, el rostro): se mantiene a la vista cuando la imagen se recorta en
              otros tamaños.<span className="hidden lg:inline"> Con teclado, muévelo con las flechas.</span>
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-6 border-t border-border p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <PreviewFrames kind={kind} src={previewSrc} focal={focal} filter={filter} />
          {kind === "fighter_body" && onBackgroundRemoved ? (
            <RemoveBackgroundButton src={src} onDone={onBackgroundRemoved} />
          ) : null}
          <AdjustmentsPanel value={adjustments} onChange={setAdjustments} />
          <FormField id="media-alt" label="Texto alternativo" hint="Describe la imagen para lectores de pantalla y Google.">
            <Input id="media-alt" value={alt} maxLength={300} onChange={(event) => setAlt(event.target.value)} />
          </FormField>
        </aside>
      </div>

      <div className="flex gap-2 border-t border-border bg-background p-3 sm:justify-end sm:p-4">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1 sm:flex-none" onClick={() => onSave({ crop: pixels, rotation, focal, adjustments, alt: alt.trim() })}>
          Guardar imagen
        </Button>
      </div>
    </div>
  );
}

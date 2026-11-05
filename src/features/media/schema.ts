import { z } from "zod";
import { MEDIA_KINDS } from "@/domain/media-specs";

const adjustment = z.number().min(0.5).max(1.5);
// 0 = sin realce. `default` para ediciones guardadas antes de que existiera la nitidez.
const sharpness = z.number().min(0).max(2).default(0);
const unit = z.number().min(0).max(1);

export const mediaEditSchema = z.object({
  crop: z
    .object({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .nullable(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  focal: z.object({ x: unit, y: unit }),
  adjustments: z.object({ brightness: adjustment, contrast: adjustment, saturation: adjustment, sharpness }),
  alt: z.string().trim().max(300),
});

export type MediaEdit = z.infer<typeof mediaEditSchema>;

export const DEFAULT_ADJUSTMENTS: MediaEdit["adjustments"] = { brightness: 1, contrast: 1, saturation: 1, sharpness: 0 };

export const createUploadSchema = z.object({
  kind: z.enum(MEDIA_KINDS),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export const mediaIdSchema = z.uuid();

/** Edición neutra: sin recorte manual (el servidor centra según el tipo), sin ajustes. */
export const DEFAULT_EDIT: MediaEdit = {
  crop: null,
  rotation: 0,
  focal: { x: 0.5, y: 0.5 },
  adjustments: DEFAULT_ADJUSTMENTS,
  alt: "",
};

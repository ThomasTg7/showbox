import { z } from "zod";
import { optionalImageId } from "@/lib/zod-fields";

export const watchPlatformSchema = z.object({
  name: z.string().trim().min(1, "Cada plataforma necesita un nombre").max(80, "El nombre admite hasta 80 caracteres"),
  url: z.string().trim().max(2048, "El enlace es demasiado largo").pipe(z.url({ error: "Escribe un enlace válido para la plataforma" })).refine((url) => /^https?:\/\//i.test(url), "El enlace debe comenzar con https:// o http://"),
  mediaId: optionalImageId(),
});

/** HTML forms submit the ordered platforms as one JSON field. */
export const watchPlatformsSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}, z.array(watchPlatformSchema, { error: "Revisa las plataformas de Dónde ver" }).max(12, "Puedes agregar hasta 12 plataformas").optional());

export type WatchPlatformInput = z.output<typeof watchPlatformSchema>;

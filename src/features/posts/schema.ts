import { z } from "zod";
import { EMPTY_POST_BODY, validatePostBody, type PostBody } from "@/domain/post-body";
import { publicationShape, requireScheduleDate } from "@/features/publication/schema";
import { checkbox, IMAGE_UNAVAILABLE, optionalImageId, optionalSlug, optionalText } from "@/lib/zod-fields";

/** Id de noticia (o de categoría) que llega de la URL o de una action: uuid o nada. */
export const postIdSchema = z.uuid();

export const BODY_NOT_ALLOWED = "Contenido no permitido";

/** Un formulario HTML envía el cuerpo como texto JSON; texto vacío = cuerpo vacío; texto que no es JSON = no válido. */
function parseBodyText(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return "no válido";
  }
}

const body = z.preprocess(parseBodyText, z.custom<PostBody>((value) => validatePostBody(value), BODY_NOT_ALLOWED)).default(EMPTY_POST_BODY);

const idList = (max: number, message: string) =>
  z
    .array(z.uuid({ error: message }))
    .max(max, message)
    .default([])
    .transform((ids) => [...new Set(ids)]);

export type PostData = {
  title: string;
  slug: string | null;
  excerpt: string | null;
  categoryId: string;
  featured: boolean;
  coverMediaId: string | null;
  galleryMediaIds: string[];
  body: PostBody;
  fighterIds: string[];
  eventIds: string[];
  status?: "draft" | "scheduled" | "published";
  publishAt: Date | null;
};

export const postInputSchema = z
  .object({
    title: z.string({ error: "El título es obligatorio" }).trim().min(1, "El título es obligatorio").max(140, "El título es demasiado largo (máx. 140 caracteres)"),
    slug: optionalSlug(),
    excerpt: optionalText(300, "La bajada"),
    categoryId: z.uuid({ error: "Elige una categoría" }),
    featured: checkbox(),
    coverMediaId: optionalImageId(),
    galleryMediaIds: z
      .array(z.uuid({ error: IMAGE_UNAVAILABLE }))
      .max(60, "La galería admite hasta 60 fotos")
      .default([])
      .transform((ids) => [...new Set(ids)]),
    body,
    fighterIds: idList(20, "Los boxeadores relacionados no son válidos (máx. 20)"),
    eventIds: idList(20, "Los eventos relacionados no son válidos (máx. 20)"),
    ...publicationShape,
  })
  .superRefine(requireScheduleDate)
  .transform((value): PostData => value);

export type PostFormInput = z.input<typeof postInputSchema>;
/** Lo que entrega un formulario HTML (textos y listas de ids repetidos). Se valida y convierte con `postInputSchema`. */
export type PostRawInput = PostFormInput | Record<string, string | string[]>;

export const categoryInputSchema = z.object({
  id: z.uuid().nullish(),
  name: z.string({ error: "Escribe el nombre de la categoría" }).trim().min(1, "Escribe el nombre de la categoría").max(40, "El nombre es demasiado largo (máx. 40 caracteres)"),
});

export type CategoryInput = z.input<typeof categoryInputSchema>;

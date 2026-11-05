"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import type { PostBody } from "@/domain/post-body";
import type { MediaDTO } from "@/features/media/dto";
import type { PublicationValue } from "@/features/publication/schedule";
import { readFormText } from "@/lib/form-dom";
import type { PostCategoryDTO } from "../../dto";
import type { PostFormValues } from "../../form-values";
import { buildLivePreviewPost } from "../../live-preview";

type Initial = {
  defaults: PostFormValues;
  categories: PostCategoryDTO[];
  cover: MediaDTO | null;
  gallery: MediaDTO[];
  body: PostBody;
  bodyMedia: Record<string, MediaDTO>;
};

/**
 * Lo que necesita la vista previa en vivo, juntado desde las pestañas del formulario: los campos de texto se leen al
 * cambiar (`onFormChange` en el `<form>`); portada, galería, cuerpo e imágenes llegan por sus propios avisos.
 */
export function useLivePreviewPost(initial: Initial, publication: PublicationValue) {
  const [fields, setFields] = useState({ title: initial.defaults.title ?? "", excerpt: initial.defaults.excerpt ?? "", categoryId: initial.defaults.categoryId ?? "" });
  const [cover, setCover] = useState(initial.cover);
  const [gallery, setGallery] = useState(initial.gallery);
  const [body, setBody] = useState(initial.body);
  const [media, setMedia] = useState(initial.bodyMedia);
  // La fecha de una noticia sin programar es «ahora»: se fija al abrir el formulario para no redibujar por la hora.
  const [now] = useState(() => new Date());

  const onFormChange = useCallback((event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const categoryId = form.elements.namedItem("categoryId");
    setFields({
      title: readFormText(form, "title"),
      excerpt: readFormText(form, "excerpt"),
      categoryId: categoryId instanceof HTMLSelectElement ? categoryId.value : "",
    });
  }, []);

  const addMedia = useCallback((items: MediaDTO[]) => {
    setMedia((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, item])) }));
  }, []);

  const post = useMemo(
    () => buildLivePreviewPost({ ...fields, categories: initial.categories, cover, gallery, body, media, publication, now }),
    [fields, initial.categories, cover, gallery, body, media, publication, now],
  );

  return { post, onFormChange, setCover, setGallery, setBody, addMedia };
}

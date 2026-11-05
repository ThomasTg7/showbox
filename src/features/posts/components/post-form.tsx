"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormFieldsProvider } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPTY_POST_BODY, type PostBody } from "@/domain/post-body";
import type { MediaDTO } from "@/features/media/dto";
import { PublicationControls } from "@/features/publication/components/publication-controls";
import { isPublicationValid, type PublicationValue } from "@/features/publication/schedule";
import type { FormActionState } from "@/lib/form-errors";
import { adminPath } from "@/lib/site-urls";
import type { PostCategoryDTO, RelatedItemDTO } from "../dto";
import { POST_FIELD_TABS, tabForPostField, type PostFormValues, type PostTab } from "../form-values";
import { PostLivePreview } from "./live-preview/post-live-preview";
import { useLivePreviewPost } from "./live-preview/use-live-preview-post";
import { PostEditorField } from "./post-editor-field";
import { PostDataTab, PostGalleryTab, PostRelatedTab } from "./post-tabs";

const TAB_LABELS: Record<PostTab, string> = { data: "Datos", text: "Texto", gallery: "Galería", related: "Relacionados", publication: "Publicación" };

type PostFormProps = {
  /** Acción del formulario; al editar ya trae el id (`updatePostAction.bind(null, id)`). */
  action: (previous: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults: PostFormValues;
  categories: PostCategoryDTO[];
  featured?: boolean;
  cover?: MediaDTO | null;
  gallery?: MediaDTO[];
  body?: PostBody;
  bodyMedia?: Record<string, MediaDTO>;
  fighters?: RelatedItemDTO[];
  events?: RelatedItemDTO[];
  publication: PublicationValue;
  /** Solo al editar: enlace de vista previa (o su generador). */
  previewHref?: () => Promise<string | null>;
  isEdit: boolean;
  justCreated?: boolean;
};

export function PostForm({
  action,
  defaults,
  categories,
  featured = false,
  cover = null,
  gallery = [],
  body = EMPTY_POST_BODY,
  bodyMedia = {},
  fighters = [],
  events = [],
  publication: initialPublication,
  previewHref,
  isEdit,
  justCreated,
}: PostFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<PostTab>("data");
  const [state, formAction, isSaving] = useActionState(async (previous: FormActionState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.redirectTo) router.replace(result.redirectTo);
    if (result.success) toast.success(result.success);
    if (result.error) toast.error(result.error);
    // Abre la primera pestaña que tenga un error para que se vea junto al campo.
    const firstTab = Object.keys(result.fieldErrors ?? {}).map(tabForPostField).find(Boolean);
    if (firstTab) setTab(firstTab);
    return result;
  }, {});
  const [, startTransition] = useTransition();
  const [publication, setPublication] = useState(initialPublication);
  const preview = useLivePreviewPost({ defaults, categories, cover, gallery, body, bodyMedia }, publication);
  const errors = state.fieldErrors ?? {};
  const tabsWithErrors = new Set(Object.keys(errors).map(tabForPostField));

  useEffect(() => {
    if (justCreated) toast.success("Noticia creada. Publícala cuando esté lista.");
  }, [justCreated]);

  // Sin `<form action>`: React vaciaría los campos tras cada guardado. Así lo escrito se conserva.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} onChange={preview.onFormChange} noValidate className="flex flex-col gap-6">
      <FormFieldsProvider value={{ defaults, errors, idPrefix: "post" }}>
        <Tabs value={tab} onValueChange={(value) => setTab(value as PostTab)}>
          <TabsList variant="line" className="h-auto w-full flex-wrap group-data-horizontal/tabs:h-auto justify-start gap-x-1 gap-y-1.5 pb-2">
            {(Object.keys(POST_FIELD_TABS) as PostTab[]).map((key) => (
              <TabsTrigger key={key} value={key} className="flex-none px-3">
                {TAB_LABELS[key]}
                {tabsWithErrors.has(key) ? <span aria-label="tiene errores" className="size-2 rounded-full bg-destructive" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Todas las pestañas quedan montadas (ocultas): sus campos se envían aunque no estén a la vista. */}
          <TabsContent value="data" forceMount className="pt-6" hidden={tab !== "data"}>
            <PostDataTab categories={categories} cover={cover} featured={featured} showSlug={isEdit} onCoverChange={preview.setCover} />
            {errors.coverMediaId ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {errors.coverMediaId}
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="text" forceMount className="pt-6" hidden={tab !== "text"}>
            <PostEditorField initial={body} media={bodyMedia} error={errors.body} onBodyChange={preview.setBody} onMediaAdded={preview.addMedia} />
          </TabsContent>
          <TabsContent value="gallery" forceMount className="pt-6" hidden={tab !== "gallery"}>
            <PostGalleryTab gallery={gallery} onGalleryChange={preview.setGallery} />
            {errors.galleryMediaIds ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {errors.galleryMediaIds}
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="related" forceMount className="pt-6" hidden={tab !== "related"}>
            <PostRelatedTab fighters={fighters} events={events} error={errors.fighterIds ?? errors.eventIds} />
          </TabsContent>
          <TabsContent value="publication" forceMount className="pt-6" hidden={tab !== "publication"}>
            <PublicationControls {...publication} onChange={setPublication} previewHref={previewHref} />
            {errors.publishAt ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {errors.publishAt}
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      </FormFieldsProvider>

      <PostLivePreview post={preview.post} />

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {/* En celular el botón principal queda fijo abajo. */}
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-border bg-background p-3 sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button type="submit" disabled={isSaving || !isPublicationValid(publication)} className="flex-1 sm:flex-none">
          {isSaving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear noticia"}
        </Button>
        <Button asChild variant="outline">
          <Link href={adminPath("/noticias")}>Volver al listado</Link>
        </Button>
      </div>
    </form>
  );
}

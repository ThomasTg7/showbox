"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FormField } from "@/components/admin/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostBody } from "@/domain/post-body";

// Tiptap se descarga solo cuando se abre la pestaña con un texto.
const PostEditor = dynamic(() => import("@/features/posts/editor/post-editor").then((module) => module.PostEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

type PageTextFieldProps = {
  id: string;
  label: string;
  initial: PostBody;
  error?: string;
  hint?: string;
};

/** Texto de una página fija (Nosotros, Privacidad): el editor de noticias sin fotos ni videos. Viaja en el campo oculto `body`. */
export function PageTextField({ id, label, initial, error, hint }: PageTextFieldProps) {
  const [body, setBody] = useState(initial);
  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      <input type="hidden" name="body" value={JSON.stringify(body)} />
      <PostEditor id={id} value={initial} onChange={setBody} allowMedia={false} label={label} invalid={Boolean(error)} />
    </FormField>
  );
}

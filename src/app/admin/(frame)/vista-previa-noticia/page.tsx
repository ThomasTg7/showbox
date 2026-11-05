import type { Metadata } from "next";
import { PostLivePreviewFrame } from "@/features/posts/components/live-preview/post-live-preview-frame";
import { requireAdmin } from "@/lib/require-admin";
import { publicUrl } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Vista previa de la noticia" };

/** La noticia que se está editando, dibujada como en el sitio. Los datos llegan del formulario por `postMessage`. */
export default async function PostLivePreviewPage() {
  await requireAdmin();
  return <PostLivePreviewFrame shareUrl={publicUrl("/noticias")} />;
}

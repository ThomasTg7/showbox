import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { createPostPreviewLinkAction, updatePostAction } from "@/features/posts/actions";
import { getPostForEdit, listCategories } from "@/features/posts/admin-queries";
import { PostForm } from "@/features/posts/components/post-form";
import { postToFormValues } from "@/features/posts/form-values";
import { postIdSchema } from "@/features/posts/schema";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Editar noticia" };

export default async function AdminEditarNoticiaPage({ params, searchParams }: PageProps<"/admin/noticias/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!postIdSchema.safeParse(id).success) notFound();
  const [edit, categories, query] = await Promise.all([getPostForEdit(db, id), listCategories(db), searchParams]);
  if (!edit) notFound();

  const { post, cover, gallery, bodyMedia, fighters, events } = edit;
  return (
    <AdminPage title={post.title}>
      <PostForm
        action={updatePostAction.bind(null, post.id)}
        defaults={postToFormValues(post)}
        categories={categories}
        featured={post.featured}
        cover={cover}
        gallery={gallery}
        body={post.body}
        bodyMedia={bodyMedia}
        fighters={fighters}
        events={events}
        publication={{ status: post.status, publishAt: post.publishAt }}
        previewHref={createPostPreviewLinkAction.bind(null, post.id)}
        isEdit
        justCreated={query.creada === "1"}
      />
    </AdminPage>
  );
}

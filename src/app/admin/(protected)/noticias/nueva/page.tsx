import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { db } from "@/db";
import { createPostAction } from "@/features/posts/actions";
import { listCategories } from "@/features/posts/admin-queries";
import { PostForm } from "@/features/posts/components/post-form";
import { EMPTY_POST_VALUES } from "@/features/posts/form-values";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Nueva noticia" };

export default async function AdminNuevaNoticiaPage() {
  await requireAdmin();
  const categories = await listCategories(db);

  return (
    <AdminPage title="Nueva noticia">
      <PostForm action={createPostAction} defaults={EMPTY_POST_VALUES} categories={categories} publication={{ status: "draft", publishAt: null }} isEdit={false} />
    </AdminPage>
  );
}

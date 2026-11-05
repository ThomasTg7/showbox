import { MediaImage } from "@/components/media/media-image";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PublicationBadge } from "@/features/publication/components/publication-badge";
import { formatDateTime } from "@/lib/format-date";
import { publicUrl } from "@/lib/site-urls";
import type { AdminPostRow } from "../dto";
import { PostRowActions } from "./post-row-actions";

function Cover({ post }: { post: AdminPostRow }) {
  return (
    <div className="h-12 w-20 shrink-0 overflow-hidden bg-muted">
      {post.cover ? <MediaImage media={post.cover} sizes="80px" className="size-full object-cover" /> : <div className="size-full" aria-hidden />}
    </div>
  );
}

function Details({ post }: { post: AdminPostRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-medium break-words">{post.title}</span>
      <span className="text-sm text-muted-foreground">Editada {formatDateTime(post.updatedAt)}</span>
    </div>
  );
}

function Labels({ post }: { post: AdminPostRow }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PublicationBadge status={post.status} publishAt={post.publishAt} />
      {post.featured ? <Badge variant="default">Destacada</Badge> : null}
    </div>
  );
}

/** Solo una noticia ya pública tiene enlace en el sitio; las demás se ven con la vista previa del formulario. */
function siteHrefFor(post: AdminPostRow): string | null {
  const isPublic = post.status === "published" || (post.status === "scheduled" && post.publishAt !== null && post.publishAt.getTime() <= Date.now());
  return isPublic ? publicUrl(`/noticias/${post.slug}`) : null;
}

export function PostsAdminList({ posts, hasFilters }: { posts: AdminPostRow[]; hasFilters: boolean }) {
  if (posts.length === 0) {
    return (
      <p className="border border-dashed border-border p-8 text-center text-muted-foreground">
        {hasFilters ? "Ninguna noticia coincide con esos filtros." : "Todavía no hay noticias. Crea la primera con «Nueva noticia»."}
      </p>
    );
  }

  return (
    <>
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead>Noticia</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Cover post={post} />
                  <Details post={post} />
                </div>
              </TableCell>
              <TableCell>{post.category.name}</TableCell>
              <TableCell>
                <Labels post={post} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <PostRowActions id={post.id} title={post.title} status={post.status} siteHref={siteHrefFor(post)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul className="flex flex-col gap-3 sm:hidden">
        {posts.map((post) => (
          <li key={post.id} className="flex flex-col gap-3 border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Cover post={post} />
              <Details post={post} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{post.category.name}</span>
              <Labels post={post} />
            </div>
            <PostRowActions id={post.id} title={post.title} status={post.status} siteHref={siteHrefFor(post)} />
          </li>
        ))}
      </ul>
    </>
  );
}

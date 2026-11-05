import { PhotoGallery } from "@/components/media/photo-gallery";
import type { PostDTO } from "../dto";
import { PostBody } from "../render/post-body";
import { PostHeader } from "./post-header";
import { PostRelated } from "./post-related";
import { ShareButtons } from "./share-buttons";

/**
 * Una noticia completa: cabecera, cuerpo, galería, relacionados y compartir. La usan la página pública y la vista previa
 * en vivo del panel, así lo que se ve al editar es exactamente lo que se publica.
 */
export function PostArticle({ post, shareUrl }: { post: PostDTO; shareUrl: string }) {
  return (
    <>
      <PostHeader post={post} />
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-14 px-[clamp(16px,4vw,64px)] pb-24 pt-10">
        <div className="mx-auto w-full max-w-[720px]">
          <PostBody doc={post.body} media={post.bodyMedia} />
        </div>
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-14">
          {post.gallery.length > 0 ? (
            <section aria-labelledby="post-gallery-title" data-slot="post-gallery" className="flex flex-col gap-6">
              <h2 id="post-gallery-title" className="font-display text-[clamp(26px,4vw,38px)] uppercase leading-none text-white">
                Galería
              </h2>
              <PhotoGallery media={post.gallery} title={`Galería de ${post.title}`} />
            </section>
          ) : null}
          <PostRelated fighters={post.fighters} events={post.events} />
          <ShareButtons url={shareUrl} title={post.title} />
        </div>
      </div>
    </>
  );
}

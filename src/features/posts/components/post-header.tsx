import Link from "next/link";
import { Tag } from "@/components/ui-gc/tag";
import { formatLongDate } from "@/lib/format-date";
import type { PostDTO } from "../dto";
import { PostCover } from "./post-cover";

/** Cabecera de la noticia: categoría y fecha, el único `h1`, la bajada y la portada (la imagen LCP de la página). */
export function PostHeader({ post }: { post: PostDTO }) {
  return (
    <header className="mx-auto w-full max-w-[1100px] px-[clamp(16px,4vw,64px)] pt-[calc(76px+clamp(24px,5vw,56px))]">
      <div className="mx-auto flex max-w-[820px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/noticias?categoria=${post.category.slug}`} className="outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright">
            <Tag tone="brand">{post.category.name}</Tag>
          </Link>
          <time dateTime={post.date} className="font-cond text-sm font-semibold uppercase tracking-[.1em] text-muted-foreground">
            {formatLongDate(new Date(post.date))}
          </time>
        </div>
        <h1 className="font-display text-[clamp(34px,6vw,68px)] uppercase leading-[1.02] text-white">{post.title}</h1>
        {post.excerpt ? <p className="text-lg leading-relaxed text-white/80 md:text-xl">{post.excerpt}</p> : null}
      </div>
      <PostCover cover={post.cover} sizes="(min-width: 1100px) 1100px, 100vw" priority className="mt-8" />
    </header>
  );
}

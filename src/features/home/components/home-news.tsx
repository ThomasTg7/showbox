import Link from "next/link";
import { SectionHeading } from "@/components/ui-gc/section-heading";
import { PostCard } from "@/features/posts/components/post-card";
import { TopNews } from "@/features/posts/components/top-news";
import type { HomeDTO } from "../dto";

/**
 * «Noticias» de la home (maqueta): la principal con `PostCard variant="feature"` y «Top Noticias» numeradas, en la grilla
 * `.news-grid` (1.9fr 1fr; una columna en celular). Sin ninguna noticia pública la sección no se dibuja. No lleva `priority`:
 * la imagen principal de la home es la portada.
 */
export function HomeNews({ news }: { news: HomeDTO["news"] }) {
  if (!news.main && news.top.length === 0) return null;

  return (
    <section id="noticias" aria-labelledby="home-news-title" className="sb-editorial py-[clamp(64px,8vw,110px)]">
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)]">
        <SectionHeading
          reveal
          tone="light"
          kicker="Lo último"
          title="Noticias"
          titleId="home-news-title"
          action={
            <Link href="/noticias" className="inline-flex min-h-11 items-center gap-4 border-b-2 border-brand pb-1 font-cond text-sm font-extrabold uppercase tracking-[.1em] text-black">
              Todas las noticias <span aria-hidden>→</span>
            </Link>
          }
        />
        <div className="grid gap-7 lg:grid-cols-[1.9fr_1fr]">
          {news.main ? (
            <div data-reveal>
              <PostCard post={news.main} variant="feature" heading="h3" />
            </div>
          ) : null}
          <div data-reveal>
            <TopNews posts={news.top} />
          </div>
        </div>
      </div>
    </section>
  );
}

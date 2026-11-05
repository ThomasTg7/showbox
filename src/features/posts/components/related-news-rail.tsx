import Link from "next/link";
import type { PostCardDTO } from "../dto";
import { PostCard } from "./post-card";

/**
 * Carrusel «Noticias» de la ficha de un boxeador y de la página de un evento: tarjetas que se deslizan en horizontal
 * (con imán, sin JavaScript; el recuadro se enfoca con el teclado y se recorre con las flechas). Sin noticias
 * relacionadas no se dibuja nada.
 */
export function RelatedNewsRail({ posts }: { posts: PostCardDTO[] }) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="related-news-title" className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] py-12 lg:py-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 id="related-news-title" className="font-display text-[clamp(32px,5vw,56px)] uppercase leading-none text-white">
          Noticias
        </h2>
        <Link href="/noticias" className="inline-flex min-h-11 items-center font-cond text-sm font-extrabold uppercase tracking-[.1em] text-accent-bright underline-offset-4 hover:underline">
          Todas las noticias →
        </Link>
      </div>
      <ul
        // El recuadro con scroll es enfocable para poder recorrerlo con el teclado.
        tabIndex={0}
        aria-label="Noticias relacionadas"
        className="-mx-[clamp(16px,4vw,64px)] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[clamp(16px,4vw,64px)] pb-4 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-accent-bright"
      >
        {posts.map((post) => (
          <li key={post.id} className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[300px]">
            <PostCard post={post} variant="compact" />
          </li>
        ))}
      </ul>
    </section>
  );
}

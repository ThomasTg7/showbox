import Link from "next/link";
import type { PostCardDTO } from "../dto";

/** Noticias destacadas con numeración ShowBox sobre superficie editorial clara. */
export function TopNews({ posts }: { posts: PostCardDTO[] }) {
  if (posts.length === 0) return null;

  return (
    <aside aria-labelledby="top-news-title" className="border-t-[5px] border-brand bg-[#f5f3f6] px-7 py-8">
      <h2 id="top-news-title" className="mb-3.5 font-display text-[34px] uppercase leading-none text-black">
        Top <span className="text-brand-press">Noticias</span>
      </h2>
      <ol>
        {posts.map((post, index) => (
          <li key={post.id} className="group relative grid grid-cols-[38px_1fr] items-start gap-3.5 border-b border-neutral-300 py-4 last:border-b-0">
            <span aria-hidden className="grid size-[38px] place-items-center bg-brand font-display text-xl text-white transition-transform duration-300 ease-sb group-hover:-rotate-[8deg] group-hover:scale-110">
              {index + 1}
            </span>
            <div>
              <span className="mb-0.5 block font-cond text-[11px] font-extrabold uppercase tracking-[.14em] text-neutral-600">{post.category.name}</span>
              <Link href={`/noticias/${post.slug}`} className="font-cond text-[17px] font-bold uppercase leading-[1.15] tracking-[.03em] text-black outline-none transition-opacity after:absolute after:inset-0 group-hover:text-brand-press focus-visible:text-brand-press">
                {post.title}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

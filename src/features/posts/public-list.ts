/** URL del listado de noticias con solo lo que importa: la categoría y, desde la segunda, la página. */
export function postsListHref(category: string | undefined, page: number): string {
  const query = new URLSearchParams();
  if (category) query.set("categoria", category);
  if (page > 1) query.set("pagina", String(page));
  const search = query.toString();
  return search ? `/noticias?${search}` : "/noticias";
}

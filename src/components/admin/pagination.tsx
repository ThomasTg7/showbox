import Link from "next/link";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  basePath: string;
  page: number;
  hasMore: boolean;
  /** Filtros de la URL que se conservan al cambiar de página. */
  params?: Record<string, string>;
};

function pageHref(basePath: string, page: number, params: Record<string, string>): string {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ""));
  if (page > 1) query.set("pagina", String(page));
  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function Pagination({ basePath, page, hasMore, params = {} }: PaginationProps) {
  if (page === 1 && !hasMore) {
    return null;
  }

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={pageHref(basePath, page - 1, params)}>Anterior</Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">Página {page}</span>
      {hasMore ? (
        <Button asChild variant="outline">
          <Link href={pageHref(basePath, page + 1, params)}>Siguiente</Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}

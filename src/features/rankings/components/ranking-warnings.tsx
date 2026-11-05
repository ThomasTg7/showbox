import { TriangleAlert } from "lucide-react";

/** Boxeadores rankeados (o campeones) que el sitio ya no muestra: la promotora decide qué hacer con cada uno. */
export function RankingWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <section aria-labelledby="ranking-warnings-title" className="flex flex-col gap-2 border border-destructive bg-card p-3">
      <h2 id="ranking-warnings-title" className="flex items-center gap-2 text-base font-semibold">
        <TriangleAlert aria-hidden className="size-4 text-destructive" /> Hay que revisar
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">Mientras tanto, el sitio no los muestra.</p>
    </section>
  );
}

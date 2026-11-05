import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { BOUT_LEVELS, type BoutLevel } from "@/domain/bout-enums";
import { getRankingEditorData, resolveScope } from "@/features/rankings/admin-queries";
import { ChampionPicker } from "@/features/rankings/components/champion-picker";
import { RankingEditor } from "@/features/rankings/components/ranking-editor";
import { RankingVisibility } from "@/features/rankings/components/ranking-visibility";
import { RankingWarnings } from "@/features/rankings/components/ranking-warnings";
import { isLevelPublic } from "@/features/rankings/visibility";
import { listSuggestions } from "@/features/rankings/suggestions";
import { listIneligibleWarnings } from "@/features/rankings/warnings";
import { requireAdmin } from "@/lib/require-admin";
import { adminPath } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Editar ranking" };

const isLevel = (value: string): value is BoutLevel => (BOUT_LEVELS as readonly string[]).includes(value);

export default async function AdminRankingEditorPage({ params }: PageProps<"/admin/rankings/[level]/[scope]">) {
  await requireAdmin();
  const { level, scope: scopeSlug } = await params;
  if (!isLevel(level)) notFound();
  const scope = await resolveScope(db, level, scopeSlug);
  if (!scope) notFound();

  const [data, suggestions, warnings, isPublic] = await Promise.all([
    getRankingEditorData(db, scope),
    scope.divisionId ? listSuggestions(db, level, scope.divisionId) : new Map(),
    listIneligibleWarnings(db, scope),
    isLevelPublic(db, level),
  ]);

  return (
    <AdminPage
      title={`Ranking ${level === "pro" ? "pro" : "amateur"}: ${scope.label}`}
      actions={
        <Button asChild variant="outline">
          <Link href={adminPath(`/rankings?nivel=${level}`)}>
            <ArrowLeft aria-hidden /> Rankings y títulos
          </Link>
        </Button>
      }
    >
      <p className="max-w-prose text-sm text-muted-foreground">
        {data.updatedAt ? "Ordena los puestos y guarda: se crea una versión nueva y el sitio compara contra la anterior (▲▼)." : "Todavía no hay ranking: el primero que guardes aparece en el sitio con todos los puestos como «Nuevo»."}
      </p>
      {/* Oculto, se avisa aquí también: quien edita sabe que nadie lo ve todavía. */}
      {isPublic ? null : <RankingVisibility level={level} isPublic={false} />}
      <RankingWarnings warnings={warnings} />
      {scope.divisionId ? <ChampionPicker level={level} divisionId={scope.divisionId} divisionLabel={scope.label} champion={data.champion} /> : null}
      <RankingEditor
        key={data.updatedAt ?? "sin-version"}
        scope={{ level, divisionId: scope.divisionId, label: scope.label, slots: scope.slots }}
        initial={data.entries}
        baseVersionId={data.versionId}
        suggestions={scope.divisionId ? (suggestions.get(scope.divisionId) ?? []) : []}
        championId={data.champion?.id ?? null}
      />
    </AdminPage>
  );
}

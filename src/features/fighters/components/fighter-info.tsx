import { Flag } from "@/components/ui-gc/flag";
import { socialUrl, type SocialNetwork } from "@/domain/socials";
import { ageOn, countryName, formatHeight, formatWeight } from "@/domain/units";
import { formatDate } from "@/lib/format-date";
import { localToday } from "@/lib/local-time";
import type { FighterProfileDTO } from "../dto";
import { CAREER_STATUS_LABELS, STANCE_LABELS, divisionTitle } from "../labels";
import { FighterInfoTabs } from "./fighter-info-tabs";

const SOCIAL_LABELS: Record<SocialNetwork, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X" };
const SOCIAL_ORDER: SocialNetwork[] = ["instagram", "tiktok", "youtube", "x"];

function Details({ fighter }: { fighter: FighterProfileDTO }) {
  // El día se fija a mediodía UTC: a medianoche, en Ecuador cae el día anterior.
  const birth = fighter.birthDate ? new Date(`${fighter.birthDate}T12:00:00Z`) : null;
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "País",
      value: (
        <span className="inline-flex items-center gap-2">
          <Flag code={fighter.nationality} /> {countryName(fighter.nationality)}
        </span>
      ),
    },
    { label: "Ciudad de origen", value: fighter.hometown },
    { label: "Edad", value: birth ? `${ageOn(birth, localToday())} años (nació el ${formatDate(birth)})` : null },
    { label: "División", value: `${divisionTitle(fighter.division)} · ${formatWeight(fighter.division.limitKg)}` },
    { label: "Peso", value: fighter.weightKg ? formatWeight(fighter.weightKg) : null },
    { label: "Estatura", value: fighter.heightCm ? formatHeight(fighter.heightCm) : null },
    { label: "Alcance", value: fighter.reachCm ? formatHeight(fighter.reachCm) : null },
    { label: "Guardia", value: fighter.stance ? STANCE_LABELS[fighter.stance] : null },
    { label: "Disciplina base", value: fighter.baseDiscipline },
    { label: "Gimnasio", value: fighter.gym },
    { label: "Entrenador", value: fighter.coach },
    { label: "Estado", value: CAREER_STATUS_LABELS[fighter.careerStatus] },
  ];

  return (
    <dl className="grid max-w-3xl gap-x-10 sm:grid-cols-2">
      {rows
        .filter((row) => row.value)
        .map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt className="font-cond text-[13px] font-bold uppercase tracking-[.1em] text-muted-foreground">{row.label}</dt>
            <dd className="text-right font-semibold text-white">{row.value}</dd>
          </div>
        ))}
    </dl>
  );
}

function Socials({ socials }: { socials: FighterProfileDTO["socials"] }) {
  const links = SOCIAL_ORDER.flatMap((network) => {
    const url = socials[network] ? socialUrl(network, socials[network]) : null;
    return url ? [{ network, url }] : [];
  });
  if (links.length === 0) return <p className="text-muted-foreground">Este boxeador aún no comparte sus redes.</p>;

  return (
    <ul className="flex flex-wrap gap-3">
      {links.map(({ network, url }) => (
        <li key={network}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center border border-border px-5 font-cond text-base font-extrabold uppercase tracking-[.1em] text-white transition-opacity hover:border-brand hover:text-accent-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
          >
            {SOCIAL_LABELS[network]}
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function FighterInfo({ fighter }: { fighter: FighterProfileDTO }) {
  return (
    <section aria-label="Información del boxeador" className="mx-auto w-full max-w-[1320px] px-[clamp(16px,4vw,64px)] py-12 lg:py-16">
      <FighterInfoTabs details={<Details fighter={fighter} />} socials={<Socials socials={fighter.socials} />} />
    </section>
  );
}

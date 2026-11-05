// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { computeRecord } from "@/domain/record";
import type { MediaDTO } from "@/features/media/dto";
import { stubBrowserApis } from "@/test/browser-stubs";
import type { FighterCardDTO, FighterProfileDTO } from "../dto";
import { FIGHTER_CARD_SIZES, FighterCard } from "./fighter-card";
import { FIGHTER_HERO_SIZES, FighterHero } from "./fighter-hero";
import { RecordSummary, formatRecord } from "./record-summary";

beforeAll(stubBrowserApis);

afterEach(cleanup);

const emptyComputed = computeRecord([], "f1", "pro");

const photo: MediaDTO = {
  id: "media-1",
  kind: "fighter_body",
  width: 1200,
  height: 1800,
  focal: { x: 0.5, y: 0.5 },
  alt: "Bryan Cevallos de frente",
  variants: [
    { width: 400, height: 600, url: "/media/v/400.webp" },
    { width: 800, height: 1200, url: "/media/v/800.webp" },
  ],
  originalUrl: "/media/original.png",
};

const headshot: MediaDTO = { ...photo, id: "media-2", kind: "fighter_headshot", width: 800, height: 800, alt: "Bryan Cevallos, rostro" };

const card: FighterCardDTO = {
  id: "f1",
  slug: "bryan-cevallos",
  firstName: "Bryan",
  lastName: "Cevallos",
  nickname: "El Martillo",
  gender: "male",
  nationality: "CL",
  careerStatus: "active",
  division: { name: "Ligero", slug: "peso-superligero", limitKg: 70.3, gender: "male" },
  record: { wins: 12, losses: 2, draws: 0, noContests: 0 },
  bodyMedia: null,
  headshotMedia: null,
};

const profile: FighterProfileDTO = {
  ...card,
  birthDate: "1994-03-12",
  hometown: "Rancagua",
  weightKg: 70.3,
  heightCm: 180,
  reachCm: null,
  stance: "orthodox",
  gym: null,
  coach: null,
  baseDiscipline: null,
  bio: null,
  socials: {},
  proRecord: card.record,
  amateurRecord: { wins: 0, losses: 0, draws: 0, noContests: 0 },
  headshotMedia: null,
  gallery: [],
};

describe("FighterCard", () => {
  it("shows the brand silhouette instead of a broken image when there is no photo", () => {
    const { container } = render(<FighterCard fighter={card} />);
    expect(container.querySelector('[data-slot="fighter-silhouette"]')).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("links to the profile and loads the photo lazily with the listing sizes", () => {
    render(<FighterCard fighter={{ ...card, bodyMedia: photo }} />);
    expect(screen.getByRole("link", { name: "Bryan Cevallos" })).toHaveAttribute("href", "/boxeadores/bryan-cevallos");
    const image = screen.getByRole("img", { name: "Bryan Cevallos de frente" });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).not.toHaveAttribute("fetchpriority");
    expect(image).toHaveAttribute("sizes", FIGHTER_CARD_SIZES);
  });

  it("shows the ranking number behind the photo, hidden from assistive technology", () => {
    const { container } = render(<FighterCard fighter={card} badge="Campeón" backdrop="C" />);
    expect(screen.getByText("Campeón")).toBeInTheDocument();
    const backdrop = container.querySelector('[data-slot="fighter-card-backdrop"]');
    expect(backdrop?.textContent).toBe("C");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
  });

  it("has no backdrop number without ranking", () => {
    const { container } = render(<FighterCard fighter={card} />);
    expect(container.querySelector('[data-slot="fighter-card-backdrop"]')).toBeNull();
  });

  it("falls back to the headshot when there is no body photo", () => {
    const { container } = render(<FighterCard fighter={{ ...card, headshotMedia: headshot }} />);
    expect(screen.getByRole("img", { name: "Bryan Cevallos, rostro" })).toBeInTheDocument();
    expect(container.querySelector("[data-photo]")).toHaveAttribute("data-photo", "headshot");
    expect(container.querySelector('[data-slot="fighter-silhouette"]')).toBeNull();
  });

  it("requests only the first-row photo with priority", () => {
    render(<FighterCard fighter={{ ...card, bodyMedia: photo }} priority />);
    expect(screen.getByRole("img", { name: "Bryan Cevallos de frente" })).toHaveAttribute("fetchpriority", "high");
  });
});

describe("FighterHero", () => {
  const figures = [
    { label: "Victorias", value: 12, accent: true },
    { label: "Derrotas", value: 2 },
    { label: "Empates", value: 0 },
  ];

  it("makes the photo the LCP image: eager, high priority and real sizes", () => {
    render(<FighterHero fighter={{ ...profile, bodyMedia: photo }} figures={figures} />);
    const image = screen.getByRole("img", { name: "Bryan Cevallos de frente" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("sizes", FIGHTER_HERO_SIZES);
  });

  it("falls back to the headshot when there is no body photo", () => {
    const { container } = render(<FighterHero fighter={{ ...profile, headshotMedia: headshot }} figures={figures} />);
    expect(screen.getByRole("img", { name: "Bryan Cevallos, rostro" })).toHaveAttribute("fetchpriority", "high");
    expect(container.querySelector('[data-slot="fighter-hero-photo"] [data-photo]')).toHaveAttribute("data-photo", "headshot");
  });

  it("shows the short bio inside the card, under the name", () => {
    const { container } = render(<FighterHero fighter={{ ...profile, bio: "Campeón peso ligero." }} figures={figures} />);
    expect(container.querySelector('section [data-slot="fighter-bio"]')?.textContent).toBe("Campeón peso ligero.");
    // En pantallas bajas se muestra la copia de debajo de la portada (la de adentro se oculta con CSS).
    expect(container.querySelector('section + [data-slot="fighter-bio-below"]')?.textContent).toBe("Campeón peso ligero.");
  });

  it("puts the champion and ranking labels in the tags slot, next to the division and status", () => {
    const tags = [
      { label: "Campeón pro · Peso Ligero", isTitle: true },
      { label: "#1 P4P", isTitle: false },
    ];
    const { container } = render(<FighterHero fighter={profile} figures={figures} rankingTags={tags} />);
    const slot = container.querySelector('[data-slot="fighter-tags"]')!;
    // El título se destaca con una estrella; el puesto no.
    expect(slot.textContent).toContain("★ Campeón pro · Peso Ligero");
    expect(slot.textContent).not.toContain("★ #1 P4P");
    expect(slot.textContent).toContain("#1 P4P");
    expect(slot.textContent).toContain("Peso Ligero");
  });

  it("shows only division and status when the fighter has no ranking", () => {
    const { container } = render(<FighterHero fighter={profile} figures={figures} />);
    expect(container.querySelector('[data-slot="fighter-tags"]')?.children).toHaveLength(2);
  });

  it("omits the bio paragraph when there is none", () => {
    const { container } = render(<FighterHero fighter={profile} figures={figures} />);
    expect(container.querySelector('[data-slot="fighter-bio"]')).toBeNull();
  });

  it("shows one h1 with the name, the nickname and the three figures with their final values", () => {
    render(<FighterHero fighter={profile} figures={figures} />);
    expect(screen.getByRole("heading", { level: 1, name: "Bryan Cevallos" })).toBeInTheDocument();
    expect(screen.getByText("“El Martillo”")).toBeInTheDocument();
    expect(screen.getByText("Victorias")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="fighter-silhouette"]')).not.toBeNull();
  });
});

describe("RecordSummary", () => {
  const empty = { wins: 0, losses: 0, draws: 0, noContests: 0 };
  const noFights = { pro: emptyComputed, amateur: emptyComputed };

  it("formats records as wins-losses-draws", () => {
    expect(formatRecord({ wins: 12, losses: 2, draws: 0, noContests: 0 })).toBe("12-2-0");
    expect(formatRecord({ wins: 3, losses: 1, draws: 0, noContests: 2 })).toBe("3-1-0");
  });

  it("shows only the total record when there are no fights in OFL, and no amateur block without amateur record", () => {
    const { container } = render(<RecordSummary manual={{ pro: profile.proRecord, amateur: empty }} computed={noFights} />);
    expect(container.querySelector('[data-level="pro"] [data-record="total"]')).toHaveTextContent("12-2-0");
    expect(container.querySelector('[data-record="gc"]')).toBeNull();
    expect(container.querySelector('[data-level="amateur"]')).toBeNull();
    expect(container).not.toHaveTextContent("Sin datos");
    expect(container).not.toHaveTextContent("Sin peleas");
  });

  it("stacks the OFL record under the total, labelled in full on every screen", () => {
    const { container } = render(
      <RecordSummary manual={{ pro: profile.proRecord, amateur: empty }} computed={{ pro: { ...emptyComputed, wins: 3, losses: 1 }, amateur: emptyComputed }} />,
    );
    const pro = container.querySelector('[data-level="pro"]')!;
    const total = pro.querySelector('[data-record="total"]')!;
    const gc = pro.querySelector('[data-record="gc"]')!;
    expect(gc).toHaveTextContent("3-1-0");
    expect(total).toHaveTextContent("12-2-0");
    expect(total.compareDocumentPosition(gc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pro.querySelector("[data-record-list]")?.className).toContain("flex-col");
    expect(gc).toHaveTextContent("ShowBox Promotions");
    expect(pro).not.toHaveTextContent(/GC/);
  });

  it("titles each level «Récord profesional» / «Récord amateur» on one line, the amateur one in orange, with no «Récord total» label", () => {
    const { container } = render(<RecordSummary manual={{ pro: profile.proRecord, amateur: { ...empty, wins: 4 } }} computed={noFights} />);
    const pro = container.querySelector('[data-level="pro"] h3')!;
    const amateur = container.querySelector('[data-level="amateur"] h3')!;
    expect(pro).toHaveTextContent("Récord profesional");
    expect(amateur).toHaveTextContent("Récord amateur");
    expect(pro.className).toContain("whitespace-nowrap");
    expect(amateur.className).toContain("whitespace-nowrap");
    expect(amateur.className).toContain("text-[#FF7A1A]");
    expect(pro.className).not.toContain("text-[#FF7A1A]");
    expect(container).not.toHaveTextContent("Récord total");
  });

  it("shows the average fight time in the OFL column, only when there is one", () => {
    const withTime = { ...emptyComputed, wins: 2, losses: 1, avgFightSeconds: 522 };
    const { container } = render(<RecordSummary manual={{ pro: profile.proRecord, amateur: empty }} computed={{ pro: withTime, amateur: emptyComputed }} />);
    expect(container.querySelector('[data-record="gc"]')).toHaveTextContent("Tiempo promedio");
    expect(container.querySelector('[data-record="gc"] [data-average-time]')).toHaveTextContent("8:42");

    cleanup();
    const { container: without } = render(<RecordSummary manual={{ pro: profile.proRecord, amateur: empty }} computed={{ pro: { ...emptyComputed, wins: 1 }, amateur: emptyComputed }} />);
    expect(without.querySelector("[data-average-time]")).toBeNull();
  });

  it("shows the amateur block only when it has an amateur record", () => {
    const { container } = render(<RecordSummary manual={{ pro: profile.proRecord, amateur: { ...empty, wins: 4 } }} computed={noFights} />);
    expect(container.querySelector('[data-level="amateur"] [data-record="total"]')).toHaveTextContent("4-0-0");
  });

  it("renders no section at all when there is nothing to show", () => {
    const { container } = render(<RecordSummary manual={{ pro: empty, amateur: empty }} computed={noFights} />);
    expect(container).toBeEmptyDOMElement();
  });
});

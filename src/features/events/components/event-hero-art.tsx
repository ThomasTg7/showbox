import { ArenaBackdrop } from "@/components/brand/arena-backdrop";
import { BrandMark } from "@/components/brand/brand-mark";
import type { CSSProperties } from "react";
import { BRAND } from "@/domain/brand";
import { FighterFigure } from "@/features/fighters/components/fighter-photo";
import { HeroParallax } from "@/features/fighters/components/hero-parallax";
import type { MediaDTO } from "@/features/media/dto";
import type { BoutDTO, BoutFighterDTO, EventPageDTO } from "../dto";

function srcSet(media: MediaDTO) {
  return media.variants.map((variant) => `${variant.url} ${variant.width}w`).join(", ") || undefined;
}

const EMPTY_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";

function HeroPicture({ desktop, mobile }: { desktop: MediaDTO | null; mobile: MediaDTO | null }) {
  const image = desktop ?? mobile;
  if (!image) return null;
  const largest = image.variants.at(-1);
  const mobileLargest = mobile?.variants.at(-1);
  return (
    <picture data-slot="event-hero-picture" className={!desktop ? "md:hidden" : undefined}>
      {mobile ? <source media="(max-width: 767px)" srcSet={srcSet(mobile)} sizes="100vw" width={mobileLargest?.width || mobile.width || undefined} height={mobileLargest?.height || mobile.height || undefined} /> : null}
      <img src={desktop ? largest?.url ?? desktop.originalUrl : EMPTY_COVER} srcSet={desktop ? srcSet(desktop) : undefined} sizes="100vw" alt={image.alt}
        width={largest?.width || image.width || undefined} height={largest?.height || image.height || undefined}
        fetchPriority="high" decoding="async" style={{
          "--hero-desktop-position": `${image.focal.x * 100}% ${image.focal.y * 100}%`,
          "--hero-mobile-position": `${(mobile ?? image).focal.x * 100}% ${(mobile ?? image).focal.y * 100}%`,
        } as CSSProperties}
        className="sb-hero-image absolute inset-0 size-full object-cover" />
    </picture>
  );
}

function FaceOffFighter({ fighter, side }: { fighter: BoutFighterDTO; side: "red" | "blue" }) {
  return (
    <div className={`pointer-events-none absolute bottom-0 z-[2] h-[95%] w-[58%] lg:h-[88%] ${side === "red" ? "left-[-5%]" : "right-[-5%]"}`}>
      <HeroParallax className="absolute inset-0">
        <FighterFigure fighter={fighter} sizes="(min-width: 1024px) 36vw, 58vw" priority={side === "red"}
          imageClassName={side === "blue" ? "-scale-x-100" : undefined}
          silhouetteClassName={`absolute bottom-0 left-1/2 h-full -translate-x-1/2 text-black ${side === "red" ? "drop-shadow-[0_0_5px_rgba(215,38,61,.8)]" : "-scale-x-100 drop-shadow-[0_0_5px_rgba(30,111,217,.8)]"}`} />
      </HeroParallax>
    </div>
  );
}

/** Uploaded covers keep priority; the ShowBox arena is only the fallback stage. */
export function EventHeroArt({ event, main }: { event: EventPageDTO; main: BoutDTO | null }) {
  return (
    <div className="absolute inset-0 isolate overflow-hidden">
      <ArenaBackdrop className="z-0" />
      <div aria-hidden className="sb-hero-pulse absolute inset-0" />
      {event.heroMedia || event.heroMobileMedia ? <HeroPicture desktop={event.heroMedia} mobile={event.heroMobileMedia} /> : null}
      {!event.heroMedia ? (
        <div className={event.heroMobileMedia ? "hidden md:block" : undefined}>
          <div data-slot="hero-watermark" aria-hidden className="absolute inset-x-0 top-[16%] text-center font-display text-[19vw] uppercase leading-none tracking-[-.02em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.08)]">{BRAND.shortName}</div>
          <BrandMark className="absolute left-1/2 top-0 h-full w-full -translate-x-1/2 opacity-80" />
          {main ? <><FaceOffFighter fighter={main.red} side="red" /><FaceOffFighter fighter={main.blue} side="blue" /></> : null}
        </div>
      ) : null}
      <div aria-hidden className="sb-hero-art-shade pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,transparent_15%,rgba(0,0,0,.2)_35%,rgba(0,0,0,.8)_65%,#000_100%)]" />
      <div aria-hidden className="sb-grain pointer-events-none absolute inset-0 z-[3]" />
    </div>
  );
}

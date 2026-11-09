import { BRAND } from "@/domain/brand";
import Link from "next/link";
import { CoverMarker } from "@/components/site/cover-marker";
import { ArenaBackdrop } from "@/components/brand/arena-backdrop";
import { BrandMark } from "@/components/brand/brand-mark";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui-gc/button";
import { Tag } from "@/components/ui-gc/tag";
import { EventHero } from "@/features/events/components/event-hero";
import { showsCountdown } from "@/features/events/public-format";
import type { HomeHero as HomeHeroDTO } from "../dto";

/**
 * La portada de la home. Con un evento por delante es la misma portada del evento (careo del combate estelar, nombre,
 * fecha, cuenta regresiva y entradas); si no hay, el último evento con sus resultados; y sin ninguno, un bloque de marca
 * «Próximamente»: la home nunca queda sin portada ni se rompe.
 */
export function HomeHero({ hero }: { hero: HomeHeroDTO }) {
  if (hero.kind === "brand") {
    return (
      <section aria-labelledby="home-title" className="relative isolate flex min-h-[max(640px,100svh)] flex-col items-center justify-end overflow-hidden bg-black px-[clamp(16px,4vw,64px)] pb-[clamp(56px,10vh,120px)] pt-[76px] text-center">
        <ArenaBackdrop />
        <CoverMarker />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[14%] -z-[5] select-none text-center font-display text-[19vw] uppercase leading-[.85] whitespace-nowrap text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,.07)]">
          ShowBox
        </div>
        <BrandMark className="absolute inset-0 -z-[4] h-full w-full opacity-70" />
        <Logo size="lg" priority />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Tag tone="ember">Próximamente</Tag>
        </div>
        <h1 id="home-title" className="sb-chrome-text sb-punch-in mt-4 font-display text-[clamp(34px,9vw,120px)] uppercase leading-[.95] text-white">
          {BRAND.name}
        </h1>
        <p className="sb-spaced mt-4 max-w-xl text-[clamp(11px,1.2vw,13px)] leading-relaxed text-white/85">Pronto anunciaremos la próxima velada. Mientras tanto, conoce a nuestros boxeadores.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="primary" asChild>
            <Link href="/boxeadores">Ver boxeadores</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/quiero-pelear">Quiero pelear</Link>
          </Button>
        </div>
      </section>
    );
  }

  const { event } = hero;
  const isNext = hero.kind === "next-event";
  // Sin ticketera, «Comprar entradas» lleva a la página de entradas del sitio; un evento pasado no vende.
  const ticketHref = isNext ? (event.ticketUrl ?? "/entradas") : undefined;
  return <EventHero event={event} ticketHref={ticketHref} ticketExternal={Boolean(isNext && event.ticketUrl)} showCountdown={isNext && showsCountdown(event)} />;
}

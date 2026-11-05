import { BRAND } from "@/domain/brand";
import Link from "next/link";
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
      <section data-site-hero aria-labelledby="home-title" className="relative isolate flex min-h-[max(640px,100svh)] flex-col items-center justify-end overflow-hidden bg-black px-[clamp(16px,4vw,64px)] pb-[clamp(56px,10vh,120px)] pt-[76px] text-center">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_38%,#3a0d0c_0%,#0b0b0b_55%,#000_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[14%] -z-[5] select-none text-center font-display text-[48vw] leading-[.85] whitespace-nowrap text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,.07)]">
          OFL
        </div>
        <BrandMark className="absolute right-[10%] top-[15%] -z-[4] h-[55%] opacity-60" />
        <Logo size="lg" priority />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Tag tone="brand">Próximamente</Tag>
        </div>
        <h1 id="home-title" className="mt-4 font-display text-[clamp(52px,11vw,150px)] uppercase leading-[.95] text-white">
          {BRAND.name}
        </h1>
        <p className="mt-4 max-w-xl font-cond text-[clamp(15px,1.6vw,19px)] font-semibold uppercase tracking-[.1em] text-white/90">Pronto anunciaremos el próximo evento. Mientras tanto, conoce a nuestros boxeadores.</p>
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

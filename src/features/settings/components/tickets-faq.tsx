import { ChevronDown } from "lucide-react";

type TicketsFaqProps = { items: { q: string; a: string }[] };

/**
 * Preguntas frecuentes de `/entradas`. Sin preguntas no dibuja nada (ni el título). Cada una es un `<details>` nativo:
 * se abre sin JavaScript y con teclado.
 */
export function TicketsFaq({ items }: TicketsFaqProps) {
  if (items.length === 0) return null;

  return (
    <section data-slot="tickets-faq" aria-labelledby="tickets-faq-title" className="mt-24 max-w-[860px]">
      <p className="mb-3.5 flex items-center gap-2.5 font-cond text-[13px] font-extrabold uppercase tracking-[.2em] text-accent-bright before:block before:h-[3px] before:w-7 before:bg-brand">
        Antes de comprar
      </p>
      <h2 id="tickets-faq-title" className="mb-8 font-display text-[clamp(32px,5vw,56px)] uppercase leading-[.9] text-white">
        Preguntas frecuentes
      </h2>
      <div className="border-b border-border">
        {items.map((item) => (
          <details key={item.q} className="group border-t border-border">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-cond text-lg font-bold uppercase tracking-[.04em] text-white outline-none marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown aria-hidden className="size-5 shrink-0 text-accent-bright transition-transform group-open:rotate-180" />
            </summary>
            <p className="max-w-prose whitespace-pre-line pb-6 text-lg leading-relaxed text-white/90">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * Cinta informativa del evento. Decorativa: todo lo que
 * dice ya está en la portada, así que los lectores de pantalla la ignoran. Con «reducir movimiento» queda quieta (una sola
 * copia, en una fila que se envuelve).
 */
export function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  // Cada mitad trae al menos 5 textos: con pocos se repiten, para que la cinta nunca quede corta.
  const half = Array.from({ length: Math.max(1, Math.ceil(5 / items.length)) }, () => items).flat();

  return (
    <div className="relative z-[5] overflow-x-clip border-y border-border">
      <div aria-hidden="true" data-slot="marquee" className="overflow-hidden bg-surface py-4 text-white">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center">
          {[0, 1].map((copy) => (
            <div key={copy} className={`flex shrink-0 ${copy === 1 ? "motion-reduce:hidden" : ""}`}>
              {half.map((text, index) => (
                <span key={`${index}-${text}`} className="flex items-center gap-11 whitespace-nowrap px-[22px] font-cond text-lg font-bold uppercase tracking-[.12em] after:text-accent-bright after:content-['/']">
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

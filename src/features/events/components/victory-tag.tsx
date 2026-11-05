/**
 * «Victoria» sobre los pies de la foto del ganador, igual en la cartelera y en la página de la pelea. Va dentro del
 * recuadro de la foto (que debe ser `relative`), encima del borde de color de la esquina.
 */
export function VictoryTag({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span
      data-result="win"
      className={`absolute inset-x-0 bottom-0 flex items-center justify-center bg-brand font-cond font-extrabold uppercase text-white ${
        size === "lg" ? "h-6 text-xs tracking-[.14em] sm:h-7 sm:text-[13px]" : "h-[18px] text-[10px] tracking-[.12em] sm:h-5 sm:text-[11px]"
      }`}
    >
      Victoria
    </span>
  );
}

/**
 * Nombre de un boxeador como en las carteleras: en celular el nombre arriba y el apellido abajo («DIEGO» / «SOTO»), desde
 * `sm` en una línea. Va dentro del título o del enlace que ya tiene el estilo; los lectores de pantalla oyen el nombre
 * completo.
 */
export function FighterName({ firstName, lastName, stackFrom = "sm" }: { firstName: string; lastName: string; /** Hasta qué ancho va en dos líneas. */ stackFrom?: "sm" | "md" | "lg" | "never" }) {
  const inline = { sm: "sm:inline", md: "md:inline", lg: "lg:inline", never: "inline" }[stackFrom];
  return (
    <>
      <span className={`block ${inline}`}>{firstName}</span> <span className={`block ${inline}`}>{lastName}</span>
    </>
  );
}

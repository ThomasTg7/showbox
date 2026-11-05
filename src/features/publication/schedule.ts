export type PublicationValue = {
  status: "draft" | "scheduled" | "published";
  publishAt: Date | null;
};

/** Programar exige fecha y hora; el formulario deshabilita «Guardar» mientras no se cumpla. */
export function isPublicationValid(value: PublicationValue): boolean {
  return value.status !== "scheduled" || value.publishAt !== null;
}

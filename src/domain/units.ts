const LB_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

const regionNames = new Intl.DisplayNames("es", { type: "region" });

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG);
}

export function cmToFeetInches(cm: number): string {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg / ${kgToLb(kg)} lb`;
}

export function formatHeight(cm: number): string {
  return `${Math.round(cm)} cm / ${cmToFeetInches(cm)}`;
}

/** Edad en años cumplidos. Quien nació un 29 de febrero cumple el 1 de marzo en los años no bisiestos. */
export function ageOn(birth: Date, today: Date): number {
  const birthdayPassed =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
  return today.getUTCFullYear() - birth.getUTCFullYear() - (birthdayPassed ? 0 : 1);
}

export function countryName(code: string): string {
  return regionNames.of(code.toUpperCase()) ?? code;
}

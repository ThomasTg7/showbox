import { countries as flagCountryCodes } from "country-flag-icons";
import { countryName } from "./units";

/** Países de la región primero: la mayoría de los boxeadores son de aquí. */
const PRIORITY = ["CL", "AR", "PE", "BO", "BR", "CO", "UY", "PY", "VE", "EC", "MX"];

export type Country = { code: string; name: string };

/** Países con bandera disponible (`Flag`), con nombre en español. */
export function listCountries(): Country[] {
  const toCountry = (code: string): Country => ({ code, name: countryName(code) });
  // La librería también trae subdivisiones ("GB-ENG"); la nacionalidad es siempre ISO 3166-1 alfa-2.
  const rest = flagCountryCodes
    .filter((code) => /^[A-Z]{2}$/.test(code) && !PRIORITY.includes(code))
    .map(toCountry)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return [...PRIORITY.map(toCountry), ...rest];
}

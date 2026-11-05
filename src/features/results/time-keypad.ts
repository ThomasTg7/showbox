// Teclado numérico de la noche de pelea: se escriben solo dígitos y el reloj se arma desde la derecha, como en el
// temporizador del celular (3, 4, 2 → 0:03, 0:34, 3:42). El teléfono no necesita el signo «:».

const MAX_DIGITS = 4;

/** Dígitos escritos → `m:ss` (vacío si no hay dígitos). Los segundos pueden pasar de 59: el servidor lo rechaza con su mensaje. */
export function digitsToClock(digits: string): string {
  if (digits === "") return "";
  const padded = digits.padStart(3, "0");
  return `${Number(padded.slice(0, -2))}:${padded.slice(-2)}`;
}

/** Agrega un dígito (hasta cuatro). Un cero al principio no ocupa lugar: `0` solo queda si es lo único escrito. */
export function pressDigit(digits: string, digit: string): string {
  if (!/^\d$/.test(digit) || digits.length >= MAX_DIGITS) return digits;
  return digits === "0" ? digit : `${digits}${digit}`;
}

export function pressBackspace(digits: string): string {
  return digits.slice(0, -1);
}

const CLOCK_PATTERN = /^(\d{1,2}):([0-5]\d)$/;

/** "3:42" o "03:42" → 222 segundos. Cualquier otro formato ("342", "3.42", "3:60") → `null`. */
export function parseClock(input: string): number | null {
  const match = CLOCK_PATTERN.exec(input.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 222 → "3:42". */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

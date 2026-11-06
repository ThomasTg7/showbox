/** Keep whole words at the preferred size where possible, with a readable lower bound. */
export function fittedFontSize(preferred: number, available: number, longestWord: number, minimum: number) {
  if (available <= 0 || longestWord <= 0) return preferred;
  return Math.max(Math.min(minimum, preferred), Math.min(preferred, preferred * Math.max(0, available - 2) / longestWord));
}

/**
 * La pelea estelar de una cartelera, con las peleas en orden de cartelera (bloques y peleas por `sort_order`): la primera
 * que no está cancelada, así una estelar cancelada no sigue encabezando el sitio y la que le sigue pasa a ser la estelar.
 * Si todas están canceladas, la primera; sin peleas, `null`.
 */
export function pickMainBout<T>(bouts: readonly T[], isCancelled: (bout: T) => boolean): T | null {
  return bouts.find((bout) => !isCancelled(bout)) ?? bouts[0] ?? null;
}

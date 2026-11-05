// Módulo sin "use client": lo usan el Header/menú (cliente) y el Footer (servidor).
export const NAV_LINKS = [
  { href: "/eventos", label: "Eventos" },
  { href: "/boxeadores", label: "Boxeadores" },
  { href: "/rankings", label: "Rankings" },
  { href: "/noticias", label: "Noticias" },
  { href: "/entradas", label: "Entradas" },
] as const;

/** ¿El enlace corresponde a la página actual? `/boxeadores` también en `/boxeadores/matias-perez`. */
export function isActiveNavLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

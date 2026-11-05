/** Páginas del panel que se ven sin sesión (rutas del subdominio). */
const PUBLIC_ADMIN_PATHS = new Set(["/login", "/recuperar", "/restablecer"]);

const ADMIN_FOLDER = "/admin";

export type HostRoute = { kind: "next" } | { kind: "rewrite"; pathname: string } | { kind: "redirect"; url: string };

/** `isServerAction`: pedido con el encabezado `next-action`. */
type RequestInfo = { host: string; pathname: string; search: string; hasSession: boolean; isServerAction?: boolean };
type AdminHost = { adminHost: string; adminOrigin: string };

/** `/admin/boxeadores` → `/boxeadores`; `/admin` → `/`. `null` si la ruta no es del panel. */
function stripAdminFolder(pathname: string): string | null {
  if (pathname === ADMIN_FOLDER) return "/";
  return pathname.startsWith(`${ADMIN_FOLDER}/`) ? pathname.slice(ADMIN_FOLDER.length) : null;
}

/**
 * Decide qué hace el proxy con cada pedido según el dominio:
 * - en el subdominio del panel, `/x` se sirve desde `src/app/admin/x` (sin sesión, solo login y recuperar contraseña);
 * - en el sitio público, `/admin/...` redirige al subdominio (el panel no se sirve ahí y la cookie de sesión nunca
 *   llega al sitio público).
 * Solo mira la cookie: la verificación real (sesión válida + lista blanca) la hace `requireAdmin()`.
 */
export function routeByHost({ host, pathname, search, hasSession, isServerAction = false }: RequestInfo, { adminHost, adminOrigin }: AdminHost): HostRoute {
  const adminPathname = stripAdminFolder(pathname);

  if (host !== adminHost) {
    return adminPathname === null ? { kind: "next" } : { kind: "redirect", url: `${adminOrigin}${adminPathname}${search}` };
  }

  if (adminPathname !== null) return { kind: "redirect", url: `${adminOrigin}${adminPathname}${search}` };
  // Una server action sin cookie no se redirige aquí: el navegador reenviaría el POST al login. La deja pasar y
  // `requireAdmin()` responde con la redirección que el cliente sí sabe seguir.
  if (!hasSession && !isServerAction && !PUBLIC_ADMIN_PATHS.has(pathname)) return { kind: "redirect", url: `${adminOrigin}/login` };
  return { kind: "rewrite", pathname: pathname === "/" ? ADMIN_FOLDER : `${ADMIN_FOLDER}${pathname}` };
}

/**
 * El dominio que pidió el navegador. Con un proxy delante (Vercel, Caddy) `x-forwarded-host` es el original y `host` el
 * interno; sin proxy solo existe `host`. Lo usan el proxy, `robots.txt` y `sitemap.xml` para saber si es el panel.
 */
export function requestHost(headers: { get(name: string): string | null }, fallback = ""): string {
  return headers.get("x-forwarded-host") ?? headers.get("host") ?? fallback;
}

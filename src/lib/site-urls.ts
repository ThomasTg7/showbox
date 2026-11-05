// El sitio público y el panel viven en dominios distintos: `showbox.test` y `admin.showbox.test`.
// En desarrollo, `localhost:3000` y `admin.localhost:3000` (Chrome y Firefox resuelven *.localhost solos).

const DEV_DEFAULTS = { SITE_URL: "http://localhost:3000", ADMIN_URL: "http://admin.localhost:3000" } as const;

function originFromEnv(name: keyof typeof DEV_DEFAULTS): string {
  const value = process.env[name];
  if (value) return new URL(value).origin;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return DEV_DEFAULTS[name];
}

/** Origen del sitio público (`https://showbox.test`). */
export function siteOrigin(): string {
  return originFromEnv("SITE_URL");
}

/** Origen del panel (`https://admin.showbox.test`). Better Auth vive aquí: sesión, Google y enlaces de correo. */
export function adminOrigin(): string {
  return originFromEnv("ADMIN_URL");
}

/** Enlace absoluto a una página pública, para usarlo desde el panel (p. ej. la vista previa). */
export function publicUrl(path: string): string {
  return `${siteOrigin()}${path}`;
}

/**
 * Ruta del panel tal como la ve el navegador en el subdominio: `adminPath("/boxeadores")` → `/boxeadores`.
 * El proxy la reescribe a la carpeta `src/app/admin` (`/admin/boxeadores`). Usar siempre esta función en enlaces y
 * redirecciones del panel (no escribir `/admin/...`); `revalidatePath` sí recibe la ruta de la carpeta (`/admin/...`).
 */
export function adminPath(path: `/${string}`): string {
  return path;
}

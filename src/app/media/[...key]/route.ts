import path from "node:path";
import { LocalDriver } from "@/lib/storage/local";
import { getStorage } from "@/lib/storage";
import { IMMUTABLE_CACHE_CONTROL, IMMUTABLE_PREFIX } from "@/lib/storage/types";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

// Sirve los archivos del driver local. Con S3 las URLs públicas apuntan al bucket/CDN, no aquí.
export async function GET(_request: Request, { params }: RouteContext<"/media/[...key]">): Promise<Response> {
  const storage = getStorage();
  if (!(storage instanceof LocalDriver)) {
    return new Response("No encontrado", { status: 404 });
  }

  const key = (await params).key.join("/");
  const contentType = CONTENT_TYPES[path.extname(key).toLowerCase()];
  if (!contentType) {
    return new Response("No encontrado", { status: 404 });
  }

  try {
    const body = await storage.get(key);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        // SVG subido por un admin: sanitizado, y además sin permiso de ejecutar nada si se abre directo.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": key.startsWith(IMMUTABLE_PREFIX) ? IMMUTABLE_CACHE_CONTROL : "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}

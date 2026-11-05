import { isHttpUrl } from "@/lib/zod-fields";

export type ModelSource = { remoteHost: string; remotePathTemplate: string };

/**
 * De dónde baja el navegador el modelo de «Quitar fondo». Con `NEXT_PUBLIC_MODEL_BASE_URL` (producción: los archivos de
 * `Xenova/modnet` en `<bucket>/models/`), `transformers.js` pide `<base>/Xenova/modnet/<archivo>`; sin ella (desarrollo,
 * o una variable que no es una URL http(s)) devuelve `null` y se usa el Hub de Hugging Face.
 */
export function modelSource(baseUrl: string | undefined): ModelSource | null {
  const base = baseUrl?.trim().replace(/\/+$/, "");
  if (!base || !isHttpUrl(base)) return null;
  return { remoteHost: `${base}/`, remotePathTemplate: "{model}/" };
}

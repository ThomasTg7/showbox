export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  /** URL para que el navegador suba el archivo directo; `headers` deben enviarse tal cual en el PUT. */
  presignPut(key: string, contentType: string, maxBytes: number): Promise<{ url: string; headers: Record<string, string> }>;
}

/** Las variantes llevan la versión en la clave: nunca se sobrescriben, así que pueden cachearse para siempre. */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const IMMUTABLE_PREFIX = "variants/";

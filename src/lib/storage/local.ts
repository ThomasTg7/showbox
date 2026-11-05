import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./types";

const UPLOAD_TTL_MS = 15 * 60 * 1000;

type LocalDriverOptions = {
  rootDir: string;
  secret: string;
  now?: () => number;
};

export class LocalDriver implements StorageDriver {
  private readonly rootDir: string;
  private readonly secret: string;
  private readonly now: () => number;

  constructor({ rootDir, secret, now = Date.now }: LocalDriverOptions) {
    this.rootDir = path.resolve(rootDir);
    this.secret = secret;
    this.now = now;
  }

  private resolveKey(key: string): string {
    const filePath = path.resolve(this.rootDir, key);
    if (key.length === 0 || !filePath.startsWith(this.rootDir + path.sep)) {
      throw new Error("Clave de archivo inválida");
    }
    return filePath;
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const filePath = this.resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  }

  /** Escribe solo si la clave no existe (subida del navegador de un solo uso). Devuelve `false` si ya existía. */
  async putIfAbsent(key: string, body: Buffer): Promise<boolean> {
    const filePath = this.resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    try {
      await writeFile(filePath, body, { flag: "wx" });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    }
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  publicUrl(key: string): string {
    return `/media/${key}`;
  }

  private sign(key: string, contentType: string, maxBytes: number, expiresAt: number): string {
    return createHmac("sha256", this.secret).update(`${key}\n${contentType}\n${maxBytes}\n${expiresAt}`).digest("hex");
  }

  async presignPut(key: string, contentType: string, maxBytes: number) {
    this.resolveKey(key);
    const expiresAt = this.now() + UPLOAD_TTL_MS;
    const query = new URLSearchParams({
      ct: contentType,
      max: String(maxBytes),
      exp: String(expiresAt),
      token: this.sign(key, contentType, maxBytes, expiresAt),
    });
    return { url: `/api/media/upload/${key}?${query}`, headers: { "Content-Type": contentType } };
  }

  /** Devuelve lo que la URL firmada autoriza, o `null` si el token no corresponde o venció. */
  verifyUpload(key: string, params: URLSearchParams): { contentType: string; maxBytes: number } | null {
    const contentType = params.get("ct") ?? "";
    const maxBytes = Number(params.get("max"));
    const expiresAt = Number(params.get("exp"));
    const token = Buffer.from(params.get("token") ?? "");
    const expected = Buffer.from(this.sign(key, contentType, maxBytes, expiresAt));

    const valid = token.length === expected.length && timingSafeEqual(token, expected);
    if (!valid || this.now() > expiresAt) return null;
    return { contentType, maxBytes };
  }
}

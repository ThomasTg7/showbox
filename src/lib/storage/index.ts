import path from "node:path";
import { LocalDriver } from "./local";
import { S3Driver } from "./s3";
import type { StorageDriver } from "./types";

export type { StorageDriver } from "./types";

let instance: StorageDriver | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function createStorage(): StorageDriver {
  if (process.env.STORAGE_DRIVER === "s3") {
    return new S3Driver({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "auto",
      bucket: requireEnv("S3_BUCKET"),
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      publicUrl: requireEnv("S3_PUBLIC_URL"),
    });
  }
  return new LocalDriver({
    rootDir: process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), ".storage"),
    secret: requireEnv("BETTER_AUTH_SECRET"),
  });
}

export function getStorage(): StorageDriver {
  instance ??= createStorage();
  return instance;
}

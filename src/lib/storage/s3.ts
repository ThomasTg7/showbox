import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IMMUTABLE_CACHE_CONTROL, IMMUTABLE_PREFIX, type StorageDriver } from "./types";

const PRESIGN_TTL_SECONDS = 15 * 60;

export type S3Config = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

export class S3Driver implements StorageDriver {
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      forcePathStyle: Boolean(config.endpoint),
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: key.startsWith(IMMUTABLE_PREFIX) ? IMMUTABLE_CACHE_CONTROL : undefined,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    if (!response.Body) throw new Error(`Archivo vacío: ${key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  publicUrl(key: string): string {
    return `${this.config.publicUrl.replace(/\/+$/, "")}/${key}`;
  }

  async presignPut(key: string, contentType: string, _maxBytes: number) {
    // El largo exacto no se conoce al firmar; el tamaño se verifica en finalizeUpload.
    // `If-None-Match: *` (firmado) hace la URL de un solo uso: no puede reemplazar un original ya validado.
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, ContentType: contentType, IfNoneMatch: "*" }),
      { expiresIn: PRESIGN_TTL_SECONDS, signableHeaders: new Set(["content-type", "if-none-match"]) },
    );
    return { url, headers: { "Content-Type": contentType, "If-None-Match": "*" } };
  }
}

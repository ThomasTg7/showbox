import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleLocalUpload } from "./local-upload";
import { LocalDriver } from "./local";
import { S3Driver } from "./s3";

describe("LocalDriver", () => {
  let rootDir: string;
  let driver: LocalDriver;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(tmpdir(), "gc-storage-"));
    driver = new LocalDriver({ rootDir, secret: "test-secret" });
  });

  afterEach(() => rm(rootDir, { recursive: true, force: true }));

  it("round-trips a file through put and get", async () => {
    await driver.put("a/b.webp", Buffer.from("hola"), "image/webp");
    expect((await driver.get("a/b.webp")).toString()).toBe("hola");
  });

  it("throws on get after delete", async () => {
    await driver.put("a/b.webp", Buffer.from("hola"), "image/webp");
    await driver.delete("a/b.webp");
    await expect(driver.get("a/b.webp")).rejects.toThrow();
  });

  it("does not fail when deleting a missing key", async () => {
    await expect(driver.delete("nope.webp")).resolves.toBeUndefined();
  });

  it("builds public urls under /media", () => {
    expect(driver.publicUrl("a/b.webp")).toBe("/media/a/b.webp");
  });

  it("rejects keys that escape the storage directory", async () => {
    await expect(driver.put("../evil.txt", Buffer.from("x"), "text/plain")).rejects.toThrow("Clave de archivo inválida");
    await expect(driver.get("a/../../evil.txt")).rejects.toThrow("Clave de archivo inválida");
  });

  it("presigns an upload url that verifies", async () => {
    const { url, headers } = await driver.presignPut("originals/x.jpg", "image/jpeg", 1000);
    expect(url.startsWith("/api/media/upload/originals/x.jpg?")).toBe(true);
    expect(headers).toEqual({ "Content-Type": "image/jpeg" });
    const params = new URL(url, "http://localhost").searchParams;
    expect(driver.verifyUpload("originals/x.jpg", params)).toEqual({ contentType: "image/jpeg", maxBytes: 1000 });
  });

  it("rejects a token for another key or a tampered limit", async () => {
    const { url } = await driver.presignPut("originals/x.jpg", "image/jpeg", 1000);
    const params = new URL(url, "http://localhost").searchParams;
    expect(driver.verifyUpload("originals/y.jpg", params)).toBeNull();
    params.set("max", "999999999");
    expect(driver.verifyUpload("originals/x.jpg", params)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const past = new LocalDriver({ rootDir, secret: "test-secret", now: () => 0 });
    const { url } = await past.presignPut("originals/x.jpg", "image/jpeg", 1000);
    const params = new URL(url, "http://localhost").searchParams;
    expect(driver.verifyUpload("originals/x.jpg", params)).toBeNull();
  });
});

describe("handleLocalUpload", () => {
  let rootDir: string;
  let driver: LocalDriver;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(tmpdir(), "gc-upload-"));
    driver = new LocalDriver({ rootDir, secret: "test-secret" });
  });

  afterEach(() => rm(rootDir, { recursive: true, force: true }));

  async function upload(body: string, overrides: { contentType?: string; key?: string; withLength?: boolean } = {}) {
    const { url, headers } = await driver.presignPut("originals/x.png", "image/png", 10);
    const request = new Request(new URL(url, "http://localhost"), {
      method: "PUT",
      headers: {
        ...headers,
        ...(overrides.withLength === false ? {} : { "Content-Length": String(Buffer.byteLength(body)) }),
        ...(overrides.contentType ? { "Content-Type": overrides.contentType } : {}),
      },
      body,
    });
    return handleLocalUpload(request, overrides.key ?? "originals/x.png", driver);
  }

  it("stores the file when the token is valid", async () => {
    const response = await upload("12345");
    expect(response.status).toBe(200);
    expect((await driver.get("originals/x.png")).toString()).toBe("12345");
  });

  it("rejects a different content type than the one signed", async () => {
    expect((await upload("12345", { contentType: "text/html" })).status).toBe(400);
  });

  it("rejects a body bigger than the signed limit", async () => {
    expect((await upload("12345678901")).status).toBe(413);
  });

  it("rejects an invalid token", async () => {
    expect((await upload("12345", { key: "originals/other.png" })).status).toBe(403);
  });

  it("requires the declared length so the body is never read without a limit", async () => {
    expect((await upload("12345", { withLength: false })).status).toBe(411);
  });

  it("only accepts one upload per signed url (the validated file cannot be replaced)", async () => {
    expect((await upload("12345")).status).toBe(200);
    expect((await upload("67890")).status).toBe(409);
    expect((await driver.get("originals/x.png")).toString()).toBe("12345");
  });
});

describe("S3Driver", () => {
  const s3Mock = mockClient(S3Client);
  const config = {
    endpoint: "http://localhost:9000",
    region: "auto",
    bucket: "gc",
    accessKeyId: "key",
    secretAccessKey: "secret",
    publicUrl: "https://cdn.example.com/",
  };

  beforeEach(() => s3Mock.reset());

  it("sends a PutObjectCommand with bucket, key and content type", async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    await new S3Driver(config).put("a/b.webp", Buffer.from("x"), "image/webp");
    const input = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(input).toMatchObject({ Bucket: "gc", Key: "a/b.webp", ContentType: "image/webp" });
  });

  it("marks variants as immutable for long caching", async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    await new S3Driver(config).put("variants/1/v1/400.webp", Buffer.from("x"), "image/webp");
    expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input.CacheControl).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("builds public urls from S3_PUBLIC_URL without a double slash", () => {
    expect(new S3Driver(config).publicUrl("a/b.webp")).toBe("https://cdn.example.com/a/b.webp");
  });

  it("presigns a PUT url pointing at the endpoint and bucket", async () => {
    const { url, headers } = await new S3Driver(config).presignPut("originals/x.jpg", "image/jpeg", 1000);
    expect(url).toContain("localhost:9000");
    expect(url).toContain("originals/x.jpg");
    expect(url).toContain("X-Amz-Signature=");
    expect(headers).toEqual({ "Content-Type": "image/jpeg", "If-None-Match": "*" });
    expect(decodeURIComponent(url)).toContain("if-none-match");
  });
});

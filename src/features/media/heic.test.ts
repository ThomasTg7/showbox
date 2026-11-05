import { describe, expect, it, vi } from "vitest";
import { acceptsHeic, convertHeic, isHeicFile, jpegName } from "./heic";

vi.mock("heic-to/next", () => ({
  heicTo: vi.fn(async ({ type }: { type: string }) => new Blob(["jpeg"], { type })),
}));

describe("isHeicFile", () => {
  it("recognizes HEIC and HEIF by type", () => {
    expect(isHeicFile({ name: "foto", type: "image/heic" })).toBe(true);
    expect(isHeicFile({ name: "foto", type: "image/heif" })).toBe(true);
  });

  it("recognizes them by extension when the system reports no type (Windows)", () => {
    expect(isHeicFile({ name: "IMG_0042.HEIC", type: "" })).toBe(true);
    expect(isHeicFile({ name: "IMG_0042.heif", type: "" })).toBe(true);
  });

  it("leaves other images alone", () => {
    expect(isHeicFile({ name: "foto.jpg", type: "image/jpeg" })).toBe(false);
    expect(isHeicFile({ name: "foto.avif", type: "image/avif" })).toBe(false);
  });
});

describe("jpegName", () => {
  it("swaps the extension for .jpg", () => {
    expect(jpegName("IMG_0042.HEIC")).toBe("IMG_0042.jpg");
    expect(jpegName("pelea.final.heif")).toBe("pelea.final.jpg");
    expect(jpegName("sin-extension")).toBe("sin-extension.jpg");
  });
});

describe("acceptsHeic", () => {
  it("is allowed wherever photos are allowed", () => {
    expect(acceptsHeic("fighter_body")).toBe(true);
    expect(acceptsHeic("gallery")).toBe(true);
    expect(acceptsHeic("sponsor_logo")).toBe(true);
  });
});

describe("convertHeic", () => {
  it("returns a JPEG file with the same base name", async () => {
    const converted = await convertHeic(new File(["heic"], "IMG_0042.HEIC", { type: "image/heic" }));
    expect(converted.type).toBe("image/jpeg");
    expect(converted.name).toBe("IMG_0042.jpg");
  });
});

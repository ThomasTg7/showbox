import { describe, expect, it, vi } from "vitest";
import { prepareFile } from "./use-media-editing";

vi.mock("../actions", () => ({ getMediaEditAction: vi.fn(), saveMediaEditAction: vi.fn(), createUploadAction: vi.fn(), finalizeUploadAction: vi.fn() }));
vi.mock("heic-to/next", () => ({ heicTo: vi.fn(async ({ type }: { type: string }) => new Blob(["jpeg"], { type })) }));

describe("prepareFile", () => {
  it("converts a HEIC photo to JPEG before uploading", async () => {
    const ready = await prepareFile("fighter_body", new File(["heic"], "IMG_0042.HEIC", { type: "" }));
    expect(ready).toMatchObject({ name: "IMG_0042.jpg", type: "image/jpeg" });
  });

  it("passes accepted formats through untouched, AVIF included", async () => {
    const avif = new File(["avif"], "foto.avif", { type: "image/avif" });
    expect(await prepareFile("gallery", avif)).toBe(avif);
  });

  it("rejects formats that are not allowed", async () => {
    await expect(prepareFile("gallery", new File(["gif"], "a.gif", { type: "image/gif" }))).rejects.toThrow("Formato no permitido");
  });

  it("explains what to do when a HEIC cannot be converted", async () => {
    const { heicTo } = await import("heic-to/next");
    vi.mocked(heicTo).mockRejectedValueOnce(new Error("bad heic"));
    await expect(prepareFile("gallery", new File(["x"], "roto.heic", { type: "image/heic" }))).rejects.toThrow(
      "No se pudo convertir la foto HEIC. Ábrela y expórtala como JPG, e inténtalo de nuevo.",
    );
  });
});

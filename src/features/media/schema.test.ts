import { describe, expect, it } from "vitest";
import { mediaEditSchema } from "./schema";

const valid = {
  crop: { x: 0, y: 0, width: 100, height: 100 },
  rotation: 90,
  focal: { x: 0.5, y: 0.2 },
  adjustments: { brightness: 1, contrast: 1.2, saturation: 0.8 },
  alt: "Boxeador en el ring",
};

describe("mediaEditSchema", () => {
  it("accepts a valid edit", () => {
    expect(mediaEditSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects adjustments outside 0.5–1.5", () => {
    expect(mediaEditSchema.safeParse({ ...valid, adjustments: { ...valid.adjustments, brightness: 1.6 } }).success).toBe(false);
    expect(mediaEditSchema.safeParse({ ...valid, adjustments: { ...valid.adjustments, contrast: 0.4 } }).success).toBe(false);
  });

  it("defaults sharpness to 0 for edits saved before it existed and rejects values above 2", () => {
    expect(mediaEditSchema.parse(valid).adjustments.sharpness).toBe(0);
    expect(mediaEditSchema.safeParse({ ...valid, adjustments: { ...valid.adjustments, sharpness: 2.5 } }).success).toBe(false);
    expect(mediaEditSchema.safeParse({ ...valid, adjustments: { ...valid.adjustments, sharpness: -1 } }).success).toBe(false);
  });

  it("rejects rotations that are not multiples of 90", () => {
    expect(mediaEditSchema.safeParse({ ...valid, rotation: 45 }).success).toBe(false);
  });

  it("rejects a focal point outside the image", () => {
    expect(mediaEditSchema.safeParse({ ...valid, focal: { x: 1.2, y: 0 } }).success).toBe(false);
  });

  it("allows no crop and trims the alt text", () => {
    const parsed = mediaEditSchema.parse({ ...valid, crop: null, alt: "  Texto  " });
    expect(parsed.crop).toBeNull();
    expect(parsed.alt).toBe("Texto");
  });
});

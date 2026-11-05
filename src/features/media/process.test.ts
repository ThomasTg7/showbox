import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { renderVariants, sanitizeSvg } from "./process";
import type { MediaEdit } from "./schema";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name));

const NEUTRAL_EDIT: MediaEdit = {
  crop: null,
  rotation: 0,
  focal: { x: 0.5, y: 0.5 },
  adjustments: { brightness: 1, contrast: 1, saturation: 1, sharpness: 0 },
  alt: "",
};

async function dimensions(buffer: Buffer) {
  const { width, height, format } = await sharp(buffer).metadata();
  return { width, height, format };
}

describe("renderVariants", () => {
  it("applies the EXIF orientation before cropping a phone photo", async () => {
    // 3000×2000 guardada de lado con EXIF 6: se ve 2000×3000. El recorte 2:3 está en ese sistema.
    const variants = await renderVariants(fixture("phone-exif-rotated.jpg"), "fighter_body", {
      ...NEUTRAL_EDIT,
      crop: { x: 0, y: 0, width: 2000, height: 3000 },
    });

    expect(variants.map((v) => v.width)).toEqual([400, 800, 1200]);
    for (const variant of variants) {
      const { width, height, format } = await dimensions(variant.buffer);
      expect(format).toBe("webp");
      expect(width).toBe(variant.width);
      expect(height).toBe(variant.width * 1.5);
    }
  });

  it("keeps the alpha channel of a transparent PNG", async () => {
    const [variant] = await renderVariants(fixture("fighter-transparent.png"), "fighter_body", NEUTRAL_EDIT);

    const image = sharp(variant.buffer);
    expect((await image.metadata()).hasAlpha).toBe(true);
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Mitad izquierda transparente, mitad derecha opaca.
    expect(data[3]).toBe(0);
    expect(data[(info.width - 1) * 4 + 3]).toBe(255);
  });

  it("keeps transparency when contrast and brightness are adjusted", async () => {
    const [variant] = await renderVariants(fixture("fighter-transparent.png"), "fighter_body", {
      ...NEUTRAL_EDIT,
      adjustments: { brightness: 1.3, contrast: 1.4, saturation: 0.8, sharpness: 0 },
    });

    const { data } = await sharp(variant.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
  });

  it("sharpens the edges when sharpness is raised", async () => {
    const checker = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#777" } })
      .composite([{ input: { create: { width: 400, height: 800, channels: 3, background: "#888" } }, left: 400, top: 0 }])
      .png()
      .toBuffer();
    // Rango de brillo alrededor del borde central: el realce crea un "halo" y lo ensancha.
    async function edgeContrast(sharpness: number) {
      const [variant] = await renderVariants(checker, "gallery", { ...NEUTRAL_EDIT, adjustments: { ...NEUTRAL_EDIT.adjustments, sharpness } });
      const { data, info } = await sharp(variant.buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
      const row = Math.floor(info.height / 2) * info.width;
      const middle = Math.floor(info.width / 2);
      const window = Array.from(data.subarray(row + middle - 8, row + middle + 8));
      return Math.max(...window) - Math.min(...window);
    }

    expect(await edgeContrast(2)).toBeGreaterThan(await edgeContrast(0));
  });

  it("omits variants wider than the cropped area", async () => {
    const variants = await renderVariants(fixture("fighter-transparent.png"), "fighter_body", {
      ...NEUTRAL_EDIT,
      crop: { x: 0, y: 0, width: 600, height: 900 },
    });

    expect(variants.map((v) => v.width)).toEqual([400]);
  });

  it("clamps a crop that overflows the image by one pixel", async () => {
    const variants = await renderVariants(fixture("fighter-transparent.png"), "fighter_body", {
      ...NEUTRAL_EDIT,
      crop: { x: 0, y: 0, width: 1201, height: 1800 },
    });

    expect(variants.map((v) => v.width)).toEqual([400, 800, 1200]);
  });

  it("rotates in 90° steps before applying the crop", async () => {
    // 1200×1800 girada 90° queda 1800×1200; el recorte se define sobre la imagen ya girada.
    const variants = await renderVariants(fixture("fighter-transparent.png"), "gallery", {
      ...NEUTRAL_EDIT,
      rotation: 90,
      crop: { x: 0, y: 0, width: 1800, height: 1200 },
    });

    expect(variants.map((v) => v.width)).toEqual([800, 1600]);
    const { width, height } = await dimensions(variants[1].buffer);
    expect([width, height]).toEqual([1600, Math.round((1600 * 1200) / 1800)]);
  });

  it("center-crops to the kind aspect when there is no crop", async () => {
    const variants = await renderVariants(fixture("phone-exif-rotated.jpg"), "news_cover", NEUTRAL_EDIT);

    const { width, height } = await dimensions(variants[variants.length - 1].buffer);
    expect(width).toBe(1600);
    expect(height).toBe(900);
  });

  it("reports the height of every variant so pages can reserve their space", async () => {
    const variants = await renderVariants(fixture("fighter-transparent.png"), "gallery", {
      ...NEUTRAL_EDIT,
      crop: { x: 0, y: 0, width: 1200, height: 900 },
    });

    expect(variants.map(({ width, height }) => [width, height])).toEqual([[800, 600]]);
    const { height } = await dimensions(variants[0].buffer);
    expect(height).toBe(600);
  });

  it("keeps a square sponsor logo whole instead of cropping it to 2:1", async () => {
    const square = await sharp({ create: { width: 600, height: 600, channels: 4, background: "#fb0" } }).png().toBuffer();
    const variants = await renderVariants(square, "sponsor_logo", NEUTRAL_EDIT);

    expect(variants.map(({ width, height }) => [width, height])).toEqual([[300, 300], [600, 600]]);
  });

  it("never upscales a small image", async () => {
    const tiny = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    const variants = await renderVariants(tiny, "news_cover", NEUTRAL_EDIT);

    expect(variants.map((v) => v.width)).toEqual([300]);
  });
});

describe("sanitizeSvg", () => {
  // DOMPurify (jsdom) se importa recién al limpiar el primer SVG: se carga aquí para que esa espera no caiga dentro de un test.
  beforeAll(async () => {
    await import("isomorphic-dompurify");
  }, 60_000);

  it("removes scripts and inline event handlers", async () => {
    const clean = await sanitizeSvg(fixture("logo-with-script.svg").toString("utf8"));

    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/\son\w+=/i);
    expect(clean).toContain("<rect");
    expect(clean).toContain("viewBox");
  });

  it("removes javascript: links", async () => {
    const clean = await sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><rect width="5" height="5"/></a></svg>',
    );

    expect(clean).not.toMatch(/javascript:/i);
  });
});

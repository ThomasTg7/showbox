import { describe, expect, it } from "vitest";
import { MEDIA_KINDS, MEDIA_SPECS, checkResolution, clampCrop, describeSpec, formatsLabel, isMediaKindCompatible, variantWidthsFor } from "./media-specs";

it("allows reuse only between posters and mobile covers with identical processing specs", () => {
  for (const kind of MEDIA_KINDS) expect(isMediaKindCompatible(kind, kind)).toBe(true);
  expect(isMediaKindCompatible("event_poster", "event_hero_mobile")).toBe(true);
  expect(isMediaKindCompatible("event_hero_mobile", "event_poster")).toBe(true);
  expect(isMediaKindCompatible("event_hero", "event_hero_mobile")).toBe(false);
  expect(isMediaKindCompatible("event_poster", "gallery")).toBe(false);
  expect(isMediaKindCompatible(undefined, "event_poster")).toBe(false);
  const { label: posterLabel, ...poster } = MEDIA_SPECS.event_poster;
  const { label: mobileLabel, ...mobile } = MEDIA_SPECS.event_hero_mobile;
  expect(posterLabel).not.toBe(mobileLabel);
  expect(poster).toEqual(mobile);
});

describe("checkResolution", () => {
  it("warns with the exact minimum when the image is too small", () => {
    expect(checkResolution("fighter_body", 700, 1050)).toEqual({
      ok: false,
      warning: "La imagen es más chica que el mínimo recomendado (800×1200) y puede verse pixelada.",
    });
  });

  it("accepts an image at the recommended size", () => {
    expect(checkResolution("fighter_body", 1200, 1800)).toEqual({ ok: true });
  });

  it("accepts an image exactly at the minimum", () => {
    expect(checkResolution("fighter_body", 800, 1200).ok).toBe(true);
  });

  it("judges free-form gallery images by their longest side", () => {
    expect(checkResolution("gallery", 1200, 300).ok).toBe(true);
    expect(checkResolution("gallery", 400, 1000).ok).toBe(false);
    expect(checkResolution("gallery", 1000, 400).warning).toContain("(1200 px de lado largo)");
  });
});

describe("variantWidthsFor", () => {
  it("omits variants wider than the cropped width", () => {
    expect(variantWidthsFor("news_cover", 1000)).toEqual([400, 800]);
  });

  it("keeps every variant when the crop is large enough", () => {
    expect(variantWidthsFor("news_cover", 1600)).toEqual([400, 800, 1600]);
  });

  it("keeps 300 and 600 for raster logos", () => {
    expect(variantWidthsFor("sponsor_logo", 600)).toEqual([300, 600]);
    expect(MEDIA_SPECS.sponsor_logo.accepts).toContain("image/svg+xml");
  });

  it("falls back to the cropped width when it is below every variant", () => {
    expect(variantWidthsFor("fighter_body", 300)).toEqual([300]);
  });
});

describe("clampCrop", () => {
  it("shrinks a crop that overflows the image by rounding", () => {
    expect(clampCrop({ x: 10, y: 0, width: 1001, height: 500 }, { w: 1000, h: 500 })).toEqual({
      x: 10,
      y: 0,
      width: 990,
      height: 500,
    });
  });

  it("rounds to integers and keeps at least one pixel", () => {
    expect(clampCrop({ x: -3.4, y: 0.6, width: 0.2, height: 10.4 }, { w: 100, h: 100 })).toEqual({
      x: 0,
      y: 1,
      width: 1,
      height: 10,
    });
  });
});

describe("MEDIA_SPECS", () => {
  it("only accepts SVG for sponsor logos", () => {
    const withSvg = Object.entries(MEDIA_SPECS)
      .filter(([, spec]) => spec.accepts.includes("image/svg+xml"))
      .map(([kind]) => kind);
    expect(withSvg).toEqual(["sponsor_logo"]);
  });

  it("never forces a crop on sponsor logos: they are shown whole inside a 2:1 box (spec §5)", () => {
    expect(MEDIA_SPECS.sponsor_logo.aspect).toBeNull();
    expect(MEDIA_SPECS.sponsor_logo.box).toBe(2);
  });
});

describe("describeSpec", () => {
  it("leads with the ratio and its orientation, then recommended and minimum pixels", () => {
    expect(describeSpec("fighter_body")).toBe("Proporción 2:3 (vertical) · Recomendado: 1200×1800 px · Mínimo: 800×1200 px");
    expect(describeSpec("fighter_headshot")).toBe("Proporción 1:1 (cuadrada) · Recomendado: 800×800 px · Mínimo: 400×400 px");
    expect(describeSpec("event_hero")).toBe("Proporción 16:9 (horizontal) · Recomendado: 1920×1080 px · Mínimo: 1280×720 px");
    expect(describeSpec("og_image")).toBe("Proporción 1.91:1 (horizontal) · Recomendado: 1200×630 px · Mínimo: 1200×630 px");
  });

  it("describes boxed kinds as shown whole inside their box", () => {
    expect(describeSpec("sponsor_logo")).toBe("Proporción 2:1 (horizontal, se ve completo sin recortar) · Recomendado: 600×300 px · Mínimo: 300×150 px");
  });

  it("describes free-form kinds by their longest side", () => {
    expect(describeSpec("gallery")).toBe("Proporción libre · Recomendado: 2400 px por el lado más largo · Mínimo: 1200 px");
  });

  it("has a description for every kind", () => {
    for (const kind of Object.keys(MEDIA_SPECS) as (keyof typeof MEDIA_SPECS)[]) expect(describeSpec(kind)).toMatch(/^Proporción .+ · Recomendado: .+ px.* · Mínimo: .+ px$/);
  });
});

describe("formatsLabel", () => {
  it("lists the photo formats, HEIC included (it is converted before uploading)", () => {
    expect(formatsLabel("fighter_body")).toBe("JPG, PNG, WebP, AVIF o HEIC");
    expect(formatsLabel("gallery")).toBe("JPG, PNG, WebP, AVIF o HEIC");
  });

  it("adds SVG where logos are allowed", () => {
    expect(formatsLabel("sponsor_logo")).toBe("JPG, PNG, WebP, AVIF, HEIC o SVG");
  });
});

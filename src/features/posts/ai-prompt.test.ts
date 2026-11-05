import { describe, expect, it } from "vitest";
import { buildAiPrompt } from "./ai-prompt";

describe("buildAiPrompt", () => {
  it("adds the facts and one numbered line per photo with what it shows", () => {
    const prompt = buildAiPrompt({ facts: "Cevallos venció a Quiñónez por KO en el R2.", photos: ["Cevallos con el cinturón", "  "] });
    expect(prompt).toContain("Cevallos venció a Quiñónez por KO en el R2.");
    expect(prompt).toContain("FOTO 1: Cevallos con el cinturón");
    expect(prompt).toContain("FOTO 2: (sin descripción, ubícala donde calce mejor)");
    expect(prompt).not.toContain("[Escribe aquí");
  });

  it("tells the AI there are no photos, so it never writes a [FOTO N]", () => {
    const prompt = buildAiPrompt({ facts: "Datos.", photos: [] });
    expect(prompt).toContain("No hay fotos: no escribas [FOTO N].");
  });

  it("leaves a placeholder to fill in the AI chat when the facts are empty", () => {
    expect(buildAiPrompt({ facts: "  ", photos: [] })).toContain("[Escribe aquí qué pasó");
  });

  it("keeps the format rules the parser reads, including every supported network", () => {
    const prompt = buildAiPrompt({ facts: "x", photos: [] });
    for (const rule of ["TÍTULO:", "BAJADA:", "## ", "[FOTO 1]", "YouTube, Instagram, TikTok o Facebook"]) expect(prompt).toContain(rule);
  });
});

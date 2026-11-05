import { describe, expect, it } from "vitest";
import { modelSource } from "./model-source";

describe("modelSource", () => {
  it("uses the Hugging Face Hub (no override) when there is no base URL — development", () => {
    expect(modelSource(undefined)).toBeNull();
    expect(modelSource("")).toBeNull();
    expect(modelSource("   ")).toBeNull();
  });

  it("points the model at the bucket: <base>/<model>/<file>", () => {
    expect(modelSource("https://media.showbox.test/models")).toEqual({ remoteHost: "https://media.showbox.test/models/", remotePathTemplate: "{model}/" });
  });

  it("tolerates trailing slashes and spaces without doubling the separator", () => {
    expect(modelSource("  https://media.showbox.test/ofl/models//  ")?.remoteHost).toBe("https://media.showbox.test/ofl/models/");
  });

  it("ignores a value that is not an http(s) URL instead of breaking the editor", () => {
    expect(modelSource("javascript:alert(1)")).toBeNull();
    expect(modelSource("/models")).toBeNull();
    expect(modelSource("media.showbox.test/models")).toBeNull();
  });
});

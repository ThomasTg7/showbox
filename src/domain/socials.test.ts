import { describe, expect, it } from "vitest";
import { socialUrl } from "./socials";

describe("socialUrl", () => {
  it("turns a handle into the profile URL of each network", () => {
    expect(socialUrl("instagram", "@matias.cevallos")).toBe("https://www.instagram.com/matias.cevallos");
    expect(socialUrl("instagram", "matias.cevallos")).toBe("https://www.instagram.com/matias.cevallos");
    expect(socialUrl("tiktok", "@elToro")).toBe("https://www.tiktok.com/@elToro");
    expect(socialUrl("x", "@openfightlatam")).toBe("https://x.com/openfightlatam");
    expect(socialUrl("youtube", "@GuerraCampal")).toBe("https://www.youtube.com/@GuerraCampal");
  });

  it("keeps a full https URL as it is", () => {
    expect(socialUrl("youtube", "https://www.youtube.com/channel/UC123")).toBe("https://www.youtube.com/channel/UC123");
    expect(socialUrl("instagram", "http://instagram.com/x")).toBe("http://instagram.com/x");
  });

  it("never returns a link that is not http or https", () => {
    expect(socialUrl("instagram", "javascript:alert(1)")).toBeNull();
    expect(socialUrl("youtube", "data:text/html,<script>")).toBeNull();
    expect(socialUrl("x", "ftp://example.com")).toBeNull();
  });

  it("returns null for empty values and for handles with spaces or slashes", () => {
    expect(socialUrl("instagram", "")).toBeNull();
    expect(socialUrl("instagram", "   ")).toBeNull();
    expect(socialUrl("instagram", "nombre con espacios")).toBeNull();
    expect(socialUrl("instagram", "a/b")).toBeNull();
  });
});

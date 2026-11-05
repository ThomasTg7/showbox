import { describe, expect, it } from "vitest";
import { isPhoneLike, telUrl, whatsappUrl } from "./phone";

describe("whatsappUrl", () => {
  it("keeps only the digits of a number written with the country code", () => {
    expect(whatsappUrl("+593 99 123 4567")).toBe("https://wa.me/593991234567");
    expect(whatsappUrl("+593 (99) 123-4567")).toBe("https://wa.me/593991234567");
  });

  it("adds Ecuador's code to a mobile number written without it", () => {
    expect(whatsappUrl("99 123 4567")).toBe("https://wa.me/593991234567");
    expect(whatsappUrl("099 123 4567")).toBe("https://wa.me/593991234567");
  });

  it("returns null when there is nothing to dial", () => {
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl("   ")).toBeNull();
    expect(whatsappUrl("123")).toBeNull();
    expect(whatsappUrl("no tengo")).toBeNull();
  });
});

describe("telUrl", () => {
  it("builds a tel: link without spaces or punctuation, keeping the plus sign", () => {
    expect(telUrl("+593 2 123 4567")).toBe("tel:+59321234567");
    expect(telUrl("(02) 1234-5678")).toBe("tel:0212345678");
  });

  it("returns null for an empty number", () => {
    expect(telUrl("")).toBeNull();
    expect(telUrl("abc")).toBeNull();
  });
});

describe("isPhoneLike", () => {
  it("accepts numbers written the way people write them", () => {
    for (const phone of ["+593 99 123 4567", "(02) 2345-6789", "912345678", " +56912345678 "]) expect(isPhoneLike(phone), phone).toBe(true);
  });

  it("rejects text, scripts and numbers that are too short", () => {
    for (const phone of ["llámame", "123", "<script>1</script>", "+"]) expect(isPhoneLike(phone), phone).toBe(false);
  });
});

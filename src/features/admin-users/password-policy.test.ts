import { describe, expect, it } from "vitest";
import { validateNewPassword } from "./password-policy";

describe("validateNewPassword", () => {
  it("accepts a long enough password that matches its confirmation", () => {
    expect(validateNewPassword("Clave12345", "Clave12345")).toEqual({});
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(validateNewPassword("corta", "corta")).toEqual({
      password: "Usa al menos 8 caracteres.",
    });
  });

  it("rejects a confirmation that does not match", () => {
    expect(validateNewPassword("Clave12345", "Clave1234")).toEqual({
      confirmation: "Las contraseñas no coinciden.",
    });
  });
});

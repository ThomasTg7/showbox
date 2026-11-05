import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("explains an email outside the allowlist", () => {
    expect(authErrorMessage({ code: "EMAIL_NOT_ALLOWED" }, "x")).toBe("Este correo no tiene acceso al panel.");
  });

  it("explains an invalid or expired password link", () => {
    expect(authErrorMessage({ code: "INVALID_TOKEN" }, "x")).toBe(
      "El enlace no es válido o ya venció. Pide uno nuevo.",
    );
  });

  it("asks to wait when rate limited", () => {
    expect(authErrorMessage({ status: 429 }, "x")).toBe("Demasiados intentos. Espera un minuto y vuelve a probar.");
  });

  it("falls back to the given message for anything else", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" }, "Correo o contraseña incorrectos.")).toBe(
      "Correo o contraseña incorrectos.",
    );
    expect(authErrorMessage(null, "Algo falló.")).toBe("Algo falló.");
  });
});

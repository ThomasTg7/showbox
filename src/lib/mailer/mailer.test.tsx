import { describe, expect, it, vi } from "vitest";
import { createConsoleMailer } from "./console";
import { createResendMailer } from "./resend";
import { getLazyMailer, getMailer } from "./index";

const message = {
  to: "admin@x.cl",
  subject: "Restablece tu contraseña",
  react: <p>Abre este enlace: https://ejemplo.cl/restablecer?token=abc</p>,
};

describe("createConsoleMailer", () => {
  it("writes recipient, subject and the plain-text body so dev links are usable", async () => {
    const lines: string[] = [];
    await createConsoleMailer((text) => lines.push(text)).send(message);

    expect(lines.join("\n")).toContain("admin@x.cl");
    expect(lines.join("\n")).toContain("Restablece tu contraseña");
    expect(lines.join("\n")).toContain("https://ejemplo.cl/restablecer?token=abc");
  });
});

describe("createResendMailer", () => {
  it("sends through Resend with the configured sender", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "1" }, error: null });
    await createResendMailer({ from: "ShowBox <no-reply@x.cl>", client: { emails: { send } } }).send(message);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: "ShowBox <no-reply@x.cl>", to: "admin@x.cl", subject: message.subject }),
    );
  });

  it("throws when Resend reports an error", async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const mailer = createResendMailer({ from: "a@x.cl", client: { emails: { send } } });

    await expect(mailer.send(message)).rejects.toThrow("domain not verified");
  });
});

describe("getMailer", () => {
  it("defaults to the console driver", () => {
    expect(getMailer({})).toBeDefined();
  });

  it("refuses the resend driver without an API key and sender", () => {
    expect(() => getMailer({ MAIL_DRIVER: "resend" })).toThrow("RESEND_API_KEY");
  });
});

describe("getLazyMailer", () => {
  it("does not fail while it is built: a bad configuration fails inside send, where the caller can tolerate it", async () => {
    const mailer = getLazyMailer({ MAIL_DRIVER: "resend" });

    await expect(mailer.send(message)).rejects.toThrow("RESEND_API_KEY");
  });

  it("sends through the configured driver", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await getLazyMailer({}).send(message);

    expect(info).toHaveBeenCalledOnce();
    info.mockRestore();
  });
});

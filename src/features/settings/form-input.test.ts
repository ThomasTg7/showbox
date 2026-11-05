import { describe, expect, it } from "vitest";
import { parseSetting } from "./registry";
import { settingInputFromForm } from "./form-input";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

describe("settingInputFromForm", () => {
  it("takes the plain text fields of a setting and treats missing ones as empty", () => {
    const input = settingInputFromForm("contact", form([["email", "hola@openfightlatam.cl"], ["phone", "+593 99 123 4567"]]));

    expect(input).toEqual({ email: "hola@openfightlatam.cl", phone: "+593 99 123 4567", whatsapp: "", address: "", notifyEmail: "" });
  });

  it("pairs each question with its answer and drops the pairs left empty", () => {
    const input = settingInputFromForm(
      "ticketsFaq",
      form([["q", "¿Hay estacionamiento?"], ["a", "Sí."], ["q", "  "], ["a", ""], ["q", "¿Se devuelven?"], ["a", ""]]),
    );

    expect(input).toEqual({ items: [{ q: "¿Hay estacionamiento?", a: "Sí." }, { q: "¿Se devuelven?", a: "" }] });
    // La pregunta a medias llega al esquema, que la rechaza con un mensaje para la persona.
    expect(parseSetting("ticketsFaq", input).success).toBe(false);
  });

  it("an empty FAQ form saves no questions", () => {
    expect(parseSetting("ticketsFaq", settingInputFromForm("ticketsFaq", form([["q", ""], ["a", ""]])))).toMatchObject({ success: true, data: { items: [] } });
  });

  it("reads the text of a page from the JSON the editor sends", () => {
    const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hola" }] }] };

    expect(settingInputFromForm("about", form([["body", JSON.stringify(body)]]))).toEqual({ body });
  });

  it("an empty page text falls back to the empty document and broken JSON is rejected", () => {
    expect(parseSetting("about", settingInputFromForm("about", form([["body", ""]]))).success).toBe(true);
    expect(parseSetting("about", settingInputFromForm("about", form([["body", "{no es json"]]))).success).toBe(false);
  });
});

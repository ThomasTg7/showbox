// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { readFormText, writeFormText } from "./form-dom";

function formWithFields(): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = `<input name="title" value="Antes"><textarea name="excerpt">Bajada</textarea><input type="checkbox" name="featured">`;
  return form;
}

describe("form-dom", () => {
  it("reads text fields by name and returns an empty text for anything else", () => {
    const form = formWithFields();
    expect(readFormText(form, "title")).toBe("Antes");
    expect(readFormText(form, "excerpt")).toBe("Bajada");
    expect(readFormText(form, "missing")).toBe("");
    expect(readFormText(null, "title")).toBe("");
  });

  it("writes the value and fires a bubbling input event, like typing would", () => {
    const form = formWithFields();
    const listener = vi.fn();
    form.addEventListener("input", listener);
    writeFormText(form, "title", "Después");
    writeFormText(form, "excerpt", "Otra bajada");
    expect(readFormText(form, "title")).toBe("Después");
    expect(readFormText(form, "excerpt")).toBe("Otra bajada");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

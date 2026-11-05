// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HelpTip } from "./help-tip";

describe("HelpTip", () => {
  it("is a «?» button named after its topic that opens the explanation on tap", () => {
    render(<HelpTip topic="Bajada">Una o dos frases que resumen la noticia.</HelpTip>);
    expect(screen.queryByText("Una o dos frases que resumen la noticia.")).toBeNull();
    const trigger = screen.getByRole("button", { name: "Ayuda: Bajada" });
    expect(trigger.getAttribute("type")).toBe("button");
    fireEvent.click(trigger);
    expect(screen.getByText("Una o dos frases que resumen la noticia.")).toBeTruthy();
  });
});

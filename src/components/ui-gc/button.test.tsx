// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders a button with a brand background and white text for the primary variant", () => {
    render(<Button variant="primary">Entradas</Button>);

    const button = screen.getByRole("button", { name: "Entradas" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toMatch(/bg-brand/);
    expect(button.className).toMatch(/text-white/);
  });

  it("renders as the child element when asChild is set", () => {
    render(
      <Button asChild variant="primary">
        <a href="/entradas">Entradas</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Entradas" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/entradas");
  });
});

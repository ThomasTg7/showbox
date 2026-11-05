// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MovementBadge } from "./movement-badge";

afterEach(cleanup);

describe("MovementBadge", () => {
  it("shows a green ▲ with the number of places gained and an accessible name", () => {
    render(<MovementBadge movement={{ kind: "up", by: 2 }} />);
    const badge = screen.getByLabelText("Sube 2 puestos");
    expect(badge.textContent).toBe("▲2");
    expect(badge.className).toContain("green");
  });

  it("shows a red ▼ with the number of places lost", () => {
    render(<MovementBadge movement={{ kind: "down", by: 3 }} />);
    const badge = screen.getByLabelText("Baja 3 puestos");
    expect(badge.textContent).toBe("▼3");
    expect(badge.className).toContain("red");
  });

  it("uses the singular for a single place", () => {
    render(<MovementBadge movement={{ kind: "up", by: 1 }} />);
    expect(screen.getByLabelText("Sube 1 puesto")).toBeDefined();
  });

  it("marks a newcomer as NUEVO on yellow with black text", () => {
    render(<MovementBadge movement={{ kind: "new" }} />);
    const badge = screen.getByLabelText("Nuevo en el ranking");
    expect(badge.textContent).toBe("NUEVO");
    expect(badge.className).toContain("bg-brand");
    expect(badge.className).toContain("text-white");
  });

  it("shows a dash for no change", () => {
    render(<MovementBadge movement={{ kind: "same" }} />);
    expect(screen.getByLabelText("Sin cambios").textContent).toBe("—");
  });
});

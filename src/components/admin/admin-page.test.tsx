// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminPage } from "./admin-page";

describe("OFL administration page", () => {
  it("retains its heading, actions and content with the OFL typography", () => {
    render(<AdminPage title="Eventos" actions={<button>Nuevo evento</button>}><p>Cartelera</p></AdminPage>);
    expect(screen.getByRole("heading", { level: 1, name: "Eventos" })).toHaveClass("sb-admin-title");
    expect(screen.getByRole("button", { name: "Nuevo evento" })).toBeVisible();
    expect(screen.getByText("Cartelera")).toBeVisible();
  });
});

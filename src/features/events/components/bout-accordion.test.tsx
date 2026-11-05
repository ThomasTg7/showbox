// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BoutAccordion, BoutItem } from "./bout-accordion";

afterEach(cleanup);

function renderCard() {
  render(
    <BoutAccordion>
      <ul>
        <BoutItem boutId="a" label="Cevallos vs Quiñónez" summary={<p>Resumen A <a href="https://ejemplo.cl/cevallos">Ficha</a></p>} details={<p>Datos A</p>} />
        <BoutItem boutId="b" label="Andrango vs Mina" summary={<p>Resumen B</p>} details={<p>Datos B</p>} />
      </ul>
    </BoutAccordion>,
  );
}

const toggle = (label: string) => screen.getByRole("button", { name: new RegExp(label) });

describe("BoutItem", () => {
  it("starts closed, with the details out of the tab order", () => {
    renderCard();
    expect(toggle("Cevallos vs Quiñónez").getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(toggle("Cevallos vs Quiñónez").getAttribute("aria-controls")!)?.hasAttribute("inert")).toBe(true);
  });

  it("opens when the fight is tapped and closes when it is tapped again", () => {
    renderCard();
    fireEvent.click(screen.getByText(/Resumen A/));
    expect(toggle("Cevallos vs Quiñónez").getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(toggle("Cevallos vs Quiñónez").getAttribute("aria-controls")!)?.hasAttribute("inert")).toBe(false);
    fireEvent.click(screen.getByText(/Resumen A/));
    expect(toggle("Cevallos vs Quiñónez").getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the open fight when another one opens", () => {
    renderCard();
    fireEvent.click(toggle("Cevallos vs Quiñónez"));
    fireEvent.click(toggle("Andrango vs Mina"));
    expect(toggle("Cevallos vs Quiñónez").getAttribute("aria-expanded")).toBe("false");
    expect(toggle("Andrango vs Mina").getAttribute("aria-expanded")).toBe("true");
  });

  it("does not toggle when a link inside the summary is tapped", () => {
    renderCard();
    const link = screen.getByRole("link", { name: "Ficha" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(toggle("Cevallos vs Quiñónez").getAttribute("aria-expanded")).toBe("false");
  });
});

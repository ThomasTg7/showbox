// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Flag } from "./flag";

describe("Flag", () => {
  it("exposes the country name in Spanish as its accessible name", () => {
    render(<Flag code="cl" />);

    expect(screen.getByRole("img", { name: "Chile" })).toBeInTheDocument();
  });

  it("renders nothing for an unknown code", () => {
    const { container } = render(<Flag code="zz" />);

    expect(container).toBeEmptyDOMElement();
  });
});

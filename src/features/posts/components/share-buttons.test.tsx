// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButtons } from "./share-buttons";

afterEach(cleanup);

const URL_TO_SHARE = "https://showbox.test/noticias/cevallos-defiende-el-cinturon";

describe("ShareButtons", () => {
  it("links to WhatsApp, X and Facebook carrying the title and the address, opening outside without leaking the opener", () => {
    render(<ShareButtons url={URL_TO_SHARE} title="Cevallos defiende el cinturón" />);

    const whatsapp = screen.getByRole("link", { name: /WhatsApp/ });
    expect(whatsapp.getAttribute("href")).toBe(`https://wa.me/?text=${encodeURIComponent(`Cevallos defiende el cinturón ${URL_TO_SHARE}`)}`);
    expect(screen.getByRole("link", { name: /^Compartir en X/ }).getAttribute("href")).toBe(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent("Cevallos defiende el cinturón")}&url=${encodeURIComponent(URL_TO_SHARE)}`,
    );
    expect(screen.getByRole("link", { name: /Facebook/ }).getAttribute("href")).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_TO_SHARE)}`);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("copies the address and says «Link copiado»", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ShareButtons url={URL_TO_SHARE} title="Título" />);

    expect(screen.queryByText("Link copiado")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copiar link/ }));
    });
    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE);
    expect(screen.getByRole("status").textContent).toBe("Link copiado");
  });

  it("says it could not copy when the browser refuses", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denegado")) }, configurable: true });
    render(<ShareButtons url={URL_TO_SHARE} title="Título" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copiar link/ }));
    });
    expect(screen.getByRole("status").textContent).toMatch(/No se pudo copiar/);
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TitleChangePrompt } from "../title-change";
import { TitleChangeDialog } from "./title-change-dialog";

const { setChampionAction } = vi.hoisted(() => ({ setChampionAction: vi.fn(async () => ({ success: "Campeón actualizado" }) as { success?: string; error?: string }) }));
vi.mock("../actions", () => ({ setChampionAction }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

afterEach(() => {
  cleanup();
  setChampionAction.mockClear();
});

const prompt: TitleChangePrompt = {
  candidate: { divisionId: "11111111-1111-4111-8111-111111111111", level: "pro", newChampionId: "22222222-2222-4222-8222-222222222222" },
  newChampionName: "Jordan Quiñónez",
  divisionLabel: "Peso Ligero",
  currentChampionName: "Bryan Cevallos",
};

describe("TitleChangeDialog", () => {
  it("asks to confirm the new champion by name, level and division", () => {
    render(<TitleChangeDialog prompt={prompt} onConfirm={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("Jordan Quiñónez es el nuevo campeón pro de Peso Ligero. ¿Confirmar?")).toBeDefined();
    expect(screen.getByText(/Bryan Cevallos/)).toBeDefined();
  });

  it("crowns the fighter only when confirmed, then reports it", async () => {
    const onConfirm = vi.fn();
    render(<TitleChangeDialog prompt={prompt} onConfirm={onConfirm} onSkip={vi.fn()} />);
    expect(setChampionAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar cambio" }));

    await waitFor(() => expect(setChampionAction).toHaveBeenCalledWith("pro", prompt.candidate.divisionId, prompt.candidate.newChampionId));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it("keeps the dialog open and shows the error when crowning fails", async () => {
    setChampionAction.mockResolvedValueOnce({ error: "Ese boxeador no puede ser campeón" });
    const onConfirm = vi.fn();
    render(<TitleChangeDialog prompt={prompt} onConfirm={onConfirm} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar cambio" }));

    expect(await screen.findByText("Ese boxeador no puede ser campeón")).toBeDefined();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("lets the admin skip without changing anything", () => {
    const onSkip = vi.fn();
    render(<TitleChangeDialog prompt={prompt} onConfirm={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));
    expect(onSkip).toHaveBeenCalled();
    expect(setChampionAction).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminBout, decisionResult } from "../test-helpers";
import { BoutResultDialog } from "./bout-result-dialog";

const { clearBoutResultAction } = vi.hoisted(() => ({ clearBoutResultAction: vi.fn(async () => ({ success: "Resultado borrado" })) }));
vi.mock("../actions", () => ({ clearBoutResultAction, overturnResultAction: vi.fn(), recordBoutResultAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

afterEach(() => {
  cleanup();
  clearBoutResultAction.mockClear();
});

const finished = adminBout({ result: decisionResult, resultLine: "Cevallos venció a Quiñónez por decisión unánime" });

describe("BoutResultDialog — clearing a result", () => {
  it("asks for confirmation instead of erasing the result on the first tap", () => {
    render(<BoutResultDialog bout={finished} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Borrar resultado" }));

    expect(clearBoutResultAction).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Confirmar el borrado" })).toBeDefined();
  });

  it("erases the result only after the confirmation", async () => {
    const onClose = vi.fn();
    render(<BoutResultDialog bout={finished} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Borrar resultado" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar el resultado" }));

    await waitFor(() => expect(clearBoutResultAction).toHaveBeenCalledWith("bout-1"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("closes the confirmation with a second tap on the same button", () => {
    render(<BoutResultDialog bout={finished} onClose={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Borrar resultado" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByRole("group", { name: "Confirmar el borrado" })).toBeNull();
  });
});

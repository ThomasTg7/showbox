// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BoutResultInput } from "@/domain/bout-result";
import type { RecordResultState } from "../actions";
import { draftFromResult } from "../result-draft";
import { ResultForm } from "./result-form";

afterEach(cleanup);

const bout = { id: "bout-1", redName: "Cevallos", blueName: "Quiñónez", scheduledRounds: 3 as const, roundSeconds: 300 };

function renderForm(overrides: Partial<Parameters<typeof ResultForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: BoutResultInput) => Promise<RecordResultState>>(async () => ({ success: "Resultado guardado" }));
  render(<ResultForm bout={bout} onSubmit={onSubmit} {...overrides} />);
  return { onSubmit };
}

const choose = (label: RegExp) => fireEvent.click(screen.getByLabelText(label));
const select = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "Guardar resultado" }));

describe("ResultForm — conditional fields", () => {
  it("hides round and time for a decision and asks for the type of decision", () => {
    renderForm();
    choose(/Gana Cevallos/);
    select("Método", "ko_tko");
    expect(screen.getByLabelText("Round")).toBeDefined();
    expect(screen.getByLabelText("Tiempo (m:ss)")).toBeDefined();
    expect(screen.getByLabelText("Tipo de KO/TKO")).toBeDefined();

    select("Método", "decision");
    expect(screen.queryByLabelText("Round")).toBeNull();
    expect(screen.queryByLabelText("Tiempo (m:ss)")).toBeNull();
    expect(screen.queryByLabelText("Tipo de KO/TKO")).toBeNull();
    expect(screen.getByLabelText("Tipo de decisión")).toBeDefined();
  });

  it("offers the boxing stoppages and no submission method", () => {
    renderForm();
    choose(/Gana Quiñónez/);
    expect(screen.queryByRole("option", { name: "Sumisión" })).toBeNull();
    select("Método", "ko_tko");
    expect(screen.getByRole("option", { name: "RTD (retiro en la esquina)" })).toBeDefined();
    expect(screen.getByRole("option", { name: "TKO (detención del árbitro)" })).toBeDefined();
  });

  it("asks for the reason of a disqualification, and of a no contest (without a method to choose)", () => {
    renderForm();
    choose(/Gana Cevallos/);
    select("Método", "disqualification");
    expect(screen.getByLabelText("Motivo de la descalificación")).toBeDefined();

    choose(/Sin resultado/);
    expect(screen.queryByLabelText("Método")).toBeNull();
    expect(screen.getByLabelText("Motivo")).toBeDefined();
    expect(screen.getByLabelText("Round")).toBeDefined();
  });

  it("disables knockout and disqualification when the fight is a draw", () => {
    renderForm();
    choose(/Empate/);
    const disabled = (name: string) => (screen.getByRole("option", { name }) as HTMLOptionElement).disabled;
    expect(disabled("KO/TKO")).toBe(true);
    expect(disabled("Descalificación")).toBe(true);
    expect(disabled("Decisión")).toBe(false);
    expect(disabled("Decisión técnica")).toBe(false);
  });

  it("offers as many rounds as the fight has, up to 12", () => {
    renderForm({ bout: { ...bout, scheduledRounds: 12, roundSeconds: 180 } });
    choose(/Gana Cevallos/);
    select("Método", "ko_tko");
    const rounds = Array.from((screen.getByLabelText("Round") as HTMLSelectElement).options).map((option) => option.value);
    expect(rounds).toEqual(["", ...Array.from({ length: 12 }, (_, index) => String(index + 1))]);
  });
});

describe("ResultForm — validation and saving", () => {
  it("shows the time error of the domain and does not send", async () => {
    const { onSubmit } = renderForm();
    choose(/Gana Cevallos/);
    select("Método", "ko_tko");
    select("Tipo de KO/TKO", "ko");
    select("Round", "1");
    fireEvent.change(screen.getByLabelText("Tiempo (m:ss)"), { target: { value: "5:30" } });
    save();
    expect((await screen.findAllByText("El tiempo no puede superar 5:00")).length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the typed result and reports the saved state", async () => {
    const onSaved = vi.fn();
    const { onSubmit } = renderForm({ onSaved });
    choose(/Gana Quiñónez/);
    select("Método", "ko_tko");
    select("Tipo de KO/TKO", "rtd");
    select("Round", "2");
    fireEvent.change(screen.getByLabelText("Tiempo (m:ss)"), { target: { value: "3:42" } });
    save();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ outcome: "blue_win", method: "ko_tko", koTkoType: "rtd", endRound: 2, endTimeSeconds: 222 });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ success: "Resultado guardado" }));
  });

  it("shows the field errors that the server sends back", async () => {
    const { onSubmit } = renderForm();
    onSubmit.mockResolvedValueOnce({ fieldErrors: { koTkoType: "Elige el tipo de KO/TKO" } });
    choose(/Gana Quiñónez/);
    select("Método", "ko_tko");
    select("Tipo de KO/TKO", "ko");
    select("Round", "1");
    fireEvent.change(screen.getByLabelText("Tiempo (m:ss)"), { target: { value: "1:00" } });
    save();
    expect(await screen.findByText("Elige el tipo de KO/TKO")).toBeDefined();
  });

  it("shows a general error", async () => {
    const { onSubmit } = renderForm();
    onSubmit.mockResolvedValueOnce({ error: "Esta pelea está cancelada" });
    choose(/Gana Cevallos/);
    select("Método", "decision");
    select("Tipo de decisión", "unanimous");
    save();
    expect(await screen.findByText("Esta pelea está cancelada")).toBeDefined();
  });

  it("suggests the outcome and the type of decision from the scorecards", () => {
    renderForm();
    choose(/Gana Cevallos/);
    select("Método", "decision");
    fireEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));
    const scores = [[29, 28], [29, 28], [28, 29]];
    scores.forEach(([red, blue], index) => {
      fireEvent.change(screen.getByLabelText(`Tarjeta ${index + 1}: puntos de Cevallos`), { target: { value: String(red) } });
      fireEvent.change(screen.getByLabelText(`Tarjeta ${index + 1}: puntos de Quiñónez`), { target: { value: String(blue) } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Sugerir desde tarjetas" }));
    expect((screen.getByLabelText("Tipo de decisión") as HTMLSelectElement).value).toBe("split");
    expect((screen.getByLabelText(/Gana Cevallos/) as HTMLInputElement).checked).toBe(true);
  });

  it("writes the cards round by round, adds up each total, and takes at most five judges", async () => {
    const { onSubmit } = renderForm();
    choose(/Gana Cevallos/);
    select("Método", "decision");
    select("Tipo de decisión", "unanimous");
    fireEvent.click(screen.getByRole("radio", { name: "Round por round" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));
    fireEvent.change(screen.getByLabelText("Tarjeta 1: juez"), { target: { value: "Caicedo" } });
    [[10, 9], [9, 10], [10, 8]].forEach(([red, blue], round) => {
      fireEvent.change(screen.getByLabelText(`Tarjeta 1, round ${round + 1}: puntos de Cevallos`), { target: { value: String(red) } });
      fireEvent.change(screen.getByLabelText(`Tarjeta 1, round ${round + 1}: puntos de Quiñónez`), { target: { value: String(blue) } });
    });
    expect(screen.getByLabelText("Tarjeta 1: total de Cevallos").textContent).toBe("29");
    expect(screen.getByLabelText("Tarjeta 1: total de Quiñónez").textContent).toBe("27");

    for (let added = 1; added < 5; added += 1) fireEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));
    expect((screen.getByRole("button", { name: "Agregar tarjeta" }) as HTMLButtonElement).disabled).toBe(true);
    for (let removed = 5; removed > 1; removed -= 1) fireEvent.click(screen.getByRole("button", { name: `Quitar tarjeta ${removed}` }));

    save();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ scorecards: [{ judge: "Caicedo", rounds: [{ red: 10, blue: 9 }, { red: 9, blue: 10 }, { red: 10, blue: 8 }] }] });
  });

  it("lets the cards of a TKO show how it was going, with a point deduction, without suggesting a decision", async () => {
    const { onSubmit } = renderForm();
    choose(/Gana Cevallos/);
    select("Método", "ko_tko");
    select("Tipo de KO/TKO", "tko_referee");
    select("Round", "3");
    fireEvent.change(screen.getByLabelText("Tiempo (m:ss)"), { target: { value: "1:10" } });
    fireEvent.click(screen.getByRole("radio", { name: "Round por round" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar tarjeta" }));
    fireEvent.change(screen.getByLabelText("Tarjeta 1: juez"), { target: { value: "Caicedo" } });
    // Terminó en el round 3: se puntúan los dos rounds terminados.
    expect(screen.queryByLabelText("Tarjeta 1, round 3: puntos de Cevallos")).toBeNull();
    [[10, 9], [10, 9]].forEach(([red, blue], round) => {
      fireEvent.change(screen.getByLabelText(`Tarjeta 1, round ${round + 1}: puntos de Cevallos`), { target: { value: String(red) } });
      fireEvent.change(screen.getByLabelText(`Tarjeta 1, round ${round + 1}: puntos de Quiñónez`), { target: { value: String(blue) } });
    });
    fireEvent.change(screen.getByLabelText("Tarjeta 1, round 2: descuento a Cevallos"), { target: { value: "1" } });
    expect(screen.getByLabelText("Tarjeta 1: total de Cevallos").textContent).toBe("19");
    expect(screen.queryByRole("button", { name: "Sugerir desde tarjetas" })).toBeNull();

    save();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ method: "ko_tko", scorecards: [{ judge: "Caicedo", rounds: [{ red: 10, blue: 9 }, { red: 10, blue: 9, redDeduction: 1 }] }] });
  });

  it("starts from a saved result when correcting it", () => {
    const initial = draftFromResult({
      outcome: "blue_win",
      method: "ko_tko",
      koTkoType: "rtd",
      decisionType: null,
      dqReason: null,
      ncReason: null,
      ncNote: null,
      endRound: 2,
      endTimeSeconds: 100,
      referee: null,
      scorecards: null,
      bonuses: [],
      videoUrl: null,
      notes: null,
    });
    renderForm({ initial });
    expect((screen.getByLabelText(/Gana Quiñónez/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Método") as HTMLSelectElement).value).toBe("ko_tko");
    expect((screen.getByLabelText("Tiempo (m:ss)") as HTMLInputElement).value).toBe("1:40");
  });
});

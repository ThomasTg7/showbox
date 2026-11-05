// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminBout, decisionResult } from "../test-helpers";
import { LiveConsole } from "./live-console";
import type { LiveBout } from "./live-current-bout";

vi.mock("../actions", () => ({ startLiveEventAction: vi.fn(async () => ({})), recordBoutResultAction: vi.fn(), clearBoutResultAction: vi.fn(), overturnResultAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
// La pelea actual se reemplaza por un botón que «guarda»: aquí importa qué hace la consola con lo guardado, no el formulario.
vi.mock("./live-current-bout", () => ({
  LiveCurrentBout: ({ bout, onSaved }: { bout: LiveBout; onSaved: (boutId: string, state: object) => void }) => (
    <button type="button" onClick={() => onSaved(bout.id, { success: "Guardado" })}>
      Guardar {bout.id}
    </button>
  ),
}));

afterEach(cleanup);

const bout = (id: string, finished = false): LiveBout => ({ ...adminBout({ id, ...(finished ? { status: "completed", result: decisionResult, resultLine: `Resultado ${id}` } : {}) }), segmentName: "Estelar" });

function props(pending: LiveBout[], finished: LiveBout[]) {
  return { eventId: "event-1", eventName: "ShowBox Fight Night 5", eventStatus: "live" as const, isNight: true, startsLabel: "", pending, finished, cancelled: [], cardHref: "/c", publicHref: "/p" };
}

describe("LiveConsole — saved fights", () => {
  it("brings a fight back to the pending ones when its result is cleared after saving it", () => {
    const view = render(<LiveConsole {...props([bout("a"), bout("b")], [])} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar a" }));
    expect(screen.getByRole("button", { name: "Guardar b" })).toBeDefined();

    // El servidor devuelve «a» terminada…
    view.rerender(<LiveConsole {...props([bout("b")], [bout("a", true)])} />);
    expect(screen.getByRole("button", { name: "Guardar b" })).toBeDefined();

    // …y después, con «Corregir» → «Borrar resultado», otra vez pendiente: vuelve a ser la pelea de ahora.
    view.rerender(<LiveConsole {...props([bout("a"), bout("b")], [])} />);
    expect(screen.getByRole("button", { name: "Guardar a" })).toBeDefined();
  });
});

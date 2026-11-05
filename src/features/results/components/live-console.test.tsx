// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminBout } from "../test-helpers";
import { LiveConsole } from "./live-console";

const { startLiveEventAction } = vi.hoisted(() => ({ startLiveEventAction: vi.fn(async () => ({})) }));
vi.mock("../actions", () => ({ startLiveEventAction, recordBoutResultAction: vi.fn(), clearBoutResultAction: vi.fn(), overturnResultAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => {
  cleanup();
  startLiveEventAction.mockClear();
});

function renderConsole(props: Partial<Parameters<typeof LiveConsole>[0]> = {}) {
  render(
    <LiveConsole
      eventId="event-1"
      eventName="ShowBox Fight Night 5"
      eventStatus="scheduled"
      isNight
      startsLabel="sábado 24 de octubre, 21:00"
      pending={[{ ...adminBout(), segmentName: "Cartelera estelar" }]}
      finished={[]}
      cancelled={[]}
      cardHref="/eventos/event-1/cartelera"
      publicHref="/eventos/showbox-fight-night-5"
      {...props}
    />,
  );
}

const currentBout = () => screen.queryByRole("region", { name: "Pelea actual" });

describe("LiveConsole — opening the night", () => {
  it("does not put a far-away event live just because the screen was opened", () => {
    renderConsole({ isNight: false });
    expect(startLiveEventAction).not.toHaveBeenCalled();
    expect(currentBout()).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir la noche de pelea" })).toBeDefined();
    expect(screen.getByText(/sábado 24 de octubre, 21:00/)).toBeDefined();
  });

  it("opens the night when the admin taps the button", async () => {
    renderConsole({ isNight: false });
    fireEvent.click(screen.getByRole("button", { name: "Abrir la noche de pelea" }));

    await waitFor(() => expect(startLiveEventAction).toHaveBeenCalledWith("event-1"));
    expect(currentBout()).not.toBeNull();
    expect(screen.getByText("● EN VIVO")).toBeDefined();
  });

  it("opens the night on its own once it is the night of the event", async () => {
    renderConsole({ isNight: true });
    await waitFor(() => expect(startLiveEventAction).toHaveBeenCalledWith("event-1"));
    expect(startLiveEventAction).toHaveBeenCalledTimes(1);
    expect(currentBout()).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Abrir la noche de pelea" })).toBeNull();
  });

  it("leaves an event that is already live or finished as it is", () => {
    renderConsole({ eventStatus: "live", isNight: false });
    cleanup();
    renderConsole({ eventStatus: "completed", isNight: false, pending: [] });
    expect(startLiveEventAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Abrir la noche de pelea" })).toBeNull();
  });
});

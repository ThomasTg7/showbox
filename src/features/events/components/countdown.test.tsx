// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Countdown } from "./countdown";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T00:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const values = () => Array.from(document.querySelectorAll("[data-countdown]")).map((element) => element.textContent);

describe("Countdown", () => {
  it("shows 01 02 03 04 for a target one day, two hours, three minutes and four seconds away", () => {
    render(<Countdown target="2026-10-24T02:03:04Z" />);
    expect(values()).toEqual(["01", "02", "03", "04"]);
  });

  it("counts down every second", () => {
    render(<Countdown target="2026-10-23T00:00:10Z" />);
    expect(values()).toEqual(["00", "00", "00", "10"]);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(values()).toEqual(["00", "00", "00", "07"]);
  });

  it("does not show a made-up time before the browser clock is known (the server HTML has dashes)", () => {
    // El HTML que envía el servidor: sin efectos, así que todavía no hay hora del navegador.
    const html = renderToStaticMarkup(<Countdown target="2026-10-24T02:03:04Z" />);
    expect(html.match(/>--</g)).toHaveLength(4);
  });

  it("says EN VIVO when the time is up: at its start time the event is live by itself", () => {
    render(<Countdown target="2026-10-22T23:59:00Z" />);
    expect(screen.getByText("EN VIVO")).toBeDefined();
    expect(document.querySelector("[data-countdown]")).toBeNull();
  });

  it("moves to EN VIVO by itself when the clock reaches zero", () => {
    render(<Countdown target="2026-10-23T00:00:02Z" />);
    expect(screen.queryByText("EN VIVO")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByText("EN VIVO")).toBeDefined();
  });
});

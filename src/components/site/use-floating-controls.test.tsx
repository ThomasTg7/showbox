// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useFloatingControls } from "./use-floating-controls";

function Control({ name, pinned = false, directional = false, routeKey }: { name: string; pinned?: boolean; directional?: boolean; routeKey?: string }) {
  const { hidden, interactionProps } = useFloatingControls(pinned, directional ? "navbar" : "tickets", routeKey);
  return <div data-testid={name} data-hidden={hidden} {...interactionProps}><button>{name}</button></div>;
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("keeps the initial home cover clear until upward scroll, including on returning home", () => {
  vi.stubGlobal("scrollY", 0);
  const view = render(<Control name="nav" directional routeKey="/" />);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
  vi.stubGlobal("scrollY", 200);
  fireEvent.scroll(window);
  fireEvent.pointerMove(window);
  fireEvent.pointerDown(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
  vi.stubGlobal("scrollY", 180);
  fireEvent.scroll(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
  view.rerender(<Control name="nav" directional routeKey="/eventos" />);
  view.rerender(<Control name="nav" directional routeKey="/" />);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
});

it("hides tickets after three idle seconds while the navbar retains its four-second delay", () => {
  vi.useFakeTimers();
  render(<><Control name="nav" directional /><Control name="tickets" /></>);
  act(() => { vi.advanceTimersByTime(3_100); });
  expect(screen.getByTestId("tickets")).toHaveAttribute("data-hidden", "true");
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
  act(() => { vi.advanceTimersByTime(1_000); });
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
  fireEvent.pointerDown(window);
  expect(screen.getByTestId("tickets")).toHaveAttribute("data-hidden", "false");
});
it("hides only the directional navbar on downward scroll and restores it upward, ignoring small jitter", () => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollY", 0);
  render(<><Control name="nav" directional /><Control name="tickets" /></>);
  vi.stubGlobal("scrollY", 160);
  fireEvent.scroll(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
  expect(screen.getByTestId("tickets")).toHaveAttribute("data-hidden", "false");
  vi.stubGlobal("scrollY", 157);
  fireEvent.scroll(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
  vi.stubGlobal("scrollY", 148);
  fireEvent.scroll(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
  vi.stubGlobal("scrollY", 0);
  fireEvent.scroll(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
});

it("keeps a directional control visible while its menu or keyboard focus is in use", () => {
  vi.stubGlobal("scrollY", 0);
  const view = render(<Control name="nav" directional pinned />);
  vi.stubGlobal("scrollY", 200);
  fireEvent.scroll(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
  view.rerender(<Control name="nav" directional />);
  fireEvent.focus(screen.getByRole("button"));
  vi.stubGlobal("scrollY", 300);
  fireEvent.scroll(window);
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
});

it("keeps the downward navbar hidden through pointer activity, window focus and ticket interaction", () => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollY", 0);
  render(<><Control name="nav" directional /><Control name="tickets" /></>);
  vi.stubGlobal("scrollY", 160);
  fireEvent.scroll(window);
  for (const activity of [
    () => fireEvent.pointerMove(window),
    () => fireEvent.pointerDown(window),
    () => fireEvent.focus(window),
    () => fireEvent.pointerEnter(screen.getByTestId("tickets")),
    () => fireEvent.focus(screen.getByRole("button", { name: "tickets" })),
  ]) {
    activity();
    expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
    expect(screen.getByTestId("tickets")).toHaveAttribute("data-hidden", "false");
  }
  fireEvent.keyDown(window, { key: "Tab" });
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
});

it("shares one idle cycle and restores both controls on scroll, touch and keyboard", () => {
  vi.useFakeTimers();
  render(<><Control name="nav" /><Control name="tickets" /></>);
  act(() => { vi.advanceTimersByTime(4_100); });
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
  expect(screen.getByTestId("tickets")).toHaveAttribute("data-hidden", "true");
  for (const event of [() => fireEvent.scroll(window), () => fireEvent.pointerDown(window), () => fireEvent.keyDown(window, { key: "Tab" })]) {
    event();
    expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
    expect(screen.getByTestId("tickets")).toHaveAttribute("data-hidden", "false");
    act(() => { vi.advanceTimersByTime(4_100); });
  }
});

it("keeps focused controls and an open menu visible until interaction ends", () => {
  vi.useFakeTimers();
  const view = render(<Control name="nav" pinned />);
  act(() => { vi.advanceTimersByTime(8_000); });
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
  view.rerender(<Control name="nav" />);
  fireEvent.focus(screen.getByRole("button"));
  act(() => { vi.advanceTimersByTime(8_000); });
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "false");
  fireEvent.blur(screen.getByRole("button"), { relatedTarget: document.body });
  act(() => { vi.advanceTimersByTime(4_100); });
  expect(screen.getByTestId("nav")).toHaveAttribute("data-hidden", "true");
});

it("cleans up its timer after the last control unmounts", () => {
  vi.useFakeTimers();
  const view = render(<Control name="nav" />);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  render(<Control name="next-page" />);
  expect(screen.getByTestId("next-page")).toHaveAttribute("data-hidden", "false");
});

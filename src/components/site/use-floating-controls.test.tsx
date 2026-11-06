// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useFloatingControls } from "./use-floating-controls";

function Control({ name, pinned = false }: { name: string; pinned?: boolean }) {
  const { hidden, interactionProps } = useFloatingControls(pinned);
  return <div data-testid={name} data-hidden={hidden} {...interactionProps}><button>{name}</button></div>;
}

afterEach(() => { cleanup(); vi.useRealTimers(); });

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

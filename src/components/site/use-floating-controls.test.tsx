// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CoverMarker } from "./cover-marker";
import { useNavbarVisibility, useTicketsVisibility } from "./use-floating-controls";

function Navbar({ menuOpen = false }: { menuOpen?: boolean }) {
  const { hidden, interactionProps } = useNavbarVisibility(menuOpen, "/");
  return <div data-testid="nav" data-hidden={hidden} {...interactionProps}><button>nav</button></div>;
}
function Tickets() {
  const { hidden, interactionProps } = useTicketsVisibility();
  return <div data-testid="tickets" data-hidden={hidden} {...interactionProps}><button>tickets</button></div>;
}

const nav = () => screen.getByTestId("nav");
const tickets = () => screen.getByTestId("tickets");
const scrollTo = (y: number) => { vi.stubGlobal("scrollY", y); fireEvent.scroll(window); };
const tap = () => { fireEvent.pointerDown(window, { pointerType: "touch" }); fireEvent.pointerUp(window, { pointerType: "touch" }); };

let observe: (...bottoms: number[]) => void = () => {};
function stubIntersectionObserver() {
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) {
      observe = (...bottoms) => act(() => callback(bottoms.map(bottom => ({ boundingClientRect: { bottom } }) as IntersectionObserverEntry), this as unknown as IntersectionObserver));
    }
    observe() {}
    disconnect() {}
  });
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("shows both controls on a page without a cover", () => {
  render(<><Navbar /><Tickets /></>);
  expect(nav()).toHaveAttribute("data-hidden", "false");
  expect(tickets()).toHaveAttribute("data-hidden", "false");
});

it("hides both controls while a cover is mounted and follows it leaving and re-entering the viewport", () => {
  stubIntersectionObserver();
  vi.stubGlobal("scrollY", 0);
  const view = render(<><Navbar /><Tickets /><CoverMarker /></>);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  expect(tickets()).toHaveAttribute("data-hidden", "true");
  scrollTo(400);
  scrollTo(380);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  observe(-10);
  expect(nav()).toHaveAttribute("data-hidden", "false");
  expect(tickets()).toHaveAttribute("data-hidden", "false");
  observe(200);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  view.rerender(<><Navbar /><Tickets /></>);
  expect(nav()).toHaveAttribute("data-hidden", "false");
});

it("uses the latest record when the observer reports several at once", () => {
  stubIntersectionObserver();
  render(<><Navbar /><CoverMarker /></>);
  observe(300, -20);
  expect(nav()).toHaveAttribute("data-hidden", "false");
  observe(-20, 300);
  expect(nav()).toHaveAttribute("data-hidden", "true");
});

it("lets the keyboard recover the navbar over a cover and returns it to hidden on the next pointer press", () => {
  stubIntersectionObserver();
  render(<><Navbar /><CoverMarker /></>);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  fireEvent.keyDown(window, { key: "Tab" });
  expect(nav()).toHaveAttribute("data-hidden", "false");
  fireEvent.pointerDown(window, { pointerType: "mouse" });
  expect(nav()).toHaveAttribute("data-hidden", "true");
});

it("hides tickets after three idle seconds and the navbar after four, and a tap restores both", () => {
  vi.useFakeTimers();
  render(<><Navbar /><Tickets /></>);
  act(() => { vi.advanceTimersByTime(3_100); });
  expect(tickets()).toHaveAttribute("data-hidden", "true");
  expect(nav()).toHaveAttribute("data-hidden", "false");
  act(() => { vi.advanceTimersByTime(1_000); });
  expect(nav()).toHaveAttribute("data-hidden", "true");
  tap();
  expect(tickets()).toHaveAttribute("data-hidden", "false");
  expect(nav()).toHaveAttribute("data-hidden", "false");
});

it("does not wake idle controls when a touch turns into a scroll (pointercancel), only when it ends as a tap", () => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollY", 600);
  render(<><Navbar /><Tickets /></>);
  act(() => { vi.advanceTimersByTime(4_100); });
  fireEvent.pointerDown(window, { pointerType: "touch" });
  fireEvent.pointerCancel(window, { pointerType: "touch" });
  expect(nav()).toHaveAttribute("data-hidden", "true");
  expect(tickets()).toHaveAttribute("data-hidden", "true");
  scrollTo(640);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  expect(tickets()).toHaveAttribute("data-hidden", "false");
});

it("hides only the navbar on downward scroll and restores it upward, ignoring small jitter", () => {
  vi.stubGlobal("scrollY", 0);
  render(<><Navbar /><Tickets /></>);
  scrollTo(160);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  expect(tickets()).toHaveAttribute("data-hidden", "false");
  scrollTo(157);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  scrollTo(148);
  expect(nav()).toHaveAttribute("data-hidden", "false");
});

it("starts from the restored scroll position without hiding the navbar", () => {
  vi.stubGlobal("scrollY", 900);
  render(<Navbar />);
  expect(nav()).toHaveAttribute("data-hidden", "false");
});

it("keeps the downward navbar hidden through pointer activity, window focus and ticket interaction", () => {
  vi.stubGlobal("scrollY", 0);
  render(<><Navbar /><Tickets /></>);
  scrollTo(160);
  for (const activity of [
    () => fireEvent.pointerMove(window, { pointerType: "mouse" }),
    () => tap(),
    () => fireEvent.focus(window),
    () => fireEvent.pointerEnter(tickets(), { pointerType: "mouse" }),
    () => fireEvent.focus(screen.getByRole("button", { name: "tickets" })),
  ]) {
    activity();
    expect(nav()).toHaveAttribute("data-hidden", "true");
    expect(tickets()).toHaveAttribute("data-hidden", "false");
  }
  fireEvent.keyDown(window, { key: "Tab" });
  expect(nav()).toHaveAttribute("data-hidden", "false");
});

it("keeps a hovered or focused control visible until interaction ends, and an open menu pins the navbar", () => {
  vi.useFakeTimers();
  vi.stubGlobal("scrollY", 0);
  const view = render(<Navbar menuOpen />);
  scrollTo(200);
  act(() => { vi.advanceTimersByTime(8_000); });
  expect(nav()).toHaveAttribute("data-hidden", "false");
  view.rerender(<Navbar />);
  expect(nav()).toHaveAttribute("data-hidden", "true");
  fireEvent.focus(screen.getByRole("button"));
  expect(nav()).toHaveAttribute("data-hidden", "false");
  scrollTo(300);
  act(() => { vi.advanceTimersByTime(8_000); });
  expect(nav()).toHaveAttribute("data-hidden", "false");
  fireEvent.blur(screen.getByRole("button"), { relatedTarget: document.body });
  expect(nav()).toHaveAttribute("data-hidden", "true");
  fireEvent.pointerEnter(nav(), { pointerType: "touch" });
  expect(nav()).toHaveAttribute("data-hidden", "true");
  fireEvent.pointerEnter(nav(), { pointerType: "mouse" });
  expect(nav()).toHaveAttribute("data-hidden", "false");
  fireEvent.pointerLeave(nav());
  expect(nav()).toHaveAttribute("data-hidden", "true");
});

it("throttles mouse movement and ignores touch pointer movement", () => {
  vi.useFakeTimers();
  render(<><Navbar /><Tickets /></>);
  act(() => { vi.advanceTimersByTime(4_100); });
  fireEvent.pointerMove(window, { pointerType: "touch" });
  expect(nav()).toHaveAttribute("data-hidden", "true");
  fireEvent.pointerMove(window, { pointerType: "mouse" });
  expect(nav()).toHaveAttribute("data-hidden", "false");
  act(() => { vi.advanceTimersByTime(4_100); });
  fireEvent.pointerMove(window, { pointerType: "mouse" });
  expect(nav()).toHaveAttribute("data-hidden", "false");
});

it("cleans up its timer and listeners after the last control unmounts", () => {
  vi.useFakeTimers();
  const view = render(<Navbar />);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  render(<Navbar />);
  expect(nav()).toHaveAttribute("data-hidden", "false");
});

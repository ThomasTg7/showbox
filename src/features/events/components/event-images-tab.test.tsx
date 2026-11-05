// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { MediaDTO } from "@/features/media/dto";
import { EventImagesTab } from "./event-tabs";

vi.mock("@/features/media/actions", () => ({ getMediaEditAction: vi.fn(), saveMediaEditAction: vi.fn() }));
vi.mock("@/features/media/components/editor-dialog", () => ({ EditorDialog: () => null, mediaTriggerAttribute: (id: string) => ({ "data-media-trigger": id }) }));
afterEach(cleanup);

const image = (id: string, kind: MediaDTO["kind"]): MediaDTO => ({ id, kind, width: 1080, height: 1350, focal: { x: .5, y: .5 }, alt: id, variants: [{ width: 540, height: 675, url: `/v/${id}.webp` }], originalUrl: `/o/${id}.jpg` });

it("reuses the poster in the mobile cover and keeps the poster when the mobile cover is removed", () => {
  const poster = image("poster", "event_poster");
  const { container } = render(<EventImagesTab heroMedia={null} heroMobileMedia={null} posterMedia={poster} gallery={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Usar el afiche como portada móvil" }));
  expect(container.querySelector('input[name="heroMobileMediaId"]')).toHaveValue("poster");
  expect(screen.getAllByRole("img", { name: "poster" })).toHaveLength(2);
  const section = screen.getByRole("heading", { name: "Portada del evento (móvil)" }).closest("section")!;
  fireEvent.click(section.querySelector('button[aria-label="Quitar"]') ?? [...section.querySelectorAll("button")].find((button) => button.textContent?.includes("Quitar"))!);
  expect(container.querySelector('input[name="heroMobileMediaId"]')).toHaveValue("");
  expect(container.querySelector('input[name="posterMediaId"]')).toHaveValue("poster");
});

it("reuses the mobile cover as the poster and disables copy buttons without a source", () => {
  const mobile = image("mobile", "event_hero_mobile");
  const { container } = render(<EventImagesTab heroMedia={null} heroMobileMedia={mobile} posterMedia={null} gallery={[]} />);
  expect(screen.getByRole("button", { name: "Usar el afiche como portada móvil" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Usar la portada móvil como afiche" }));
  expect(container.querySelector('input[name="posterMediaId"]')).toHaveValue("mobile");
  expect(screen.getAllByRole("img", { name: "mobile" })).toHaveLength(2);
});

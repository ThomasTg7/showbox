// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeSpec } from "@/domain/media-specs";
import { GalleryEditor } from "./gallery-editor";
import { MediaField } from "./media-field";

vi.mock("../actions", () => ({ getMediaEditAction: vi.fn(), saveMediaEditAction: vi.fn(), createUploadAction: vi.fn(), finalizeUploadAction: vi.fn() }));

afterEach(cleanup);

describe("upload fields show what to upload before choosing a file", () => {
  it("a single image field shows the ratio and the recommended pixels of its kind", () => {
    render(<MediaField kind="fighter_body" name="bodyMediaId" />);
    expect(screen.getByText(describeSpec("fighter_body"))).toBeInTheDocument();
  });

  it("each kind shows its own recommendation", () => {
    render(<MediaField kind="sponsor_logo" name="logoMediaId" />);
    expect(screen.getByText(describeSpec("sponsor_logo"))).toBeInTheDocument();
  });

  it("a gallery shows the gallery recommendation", () => {
    render(<GalleryEditor media={[]} onChange={() => {}} />);
    expect(screen.getByText(describeSpec("gallery"))).toBeInTheDocument();
  });
});

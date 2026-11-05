// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaEditAction } from "../actions";
import type { MediaDTO } from "../dto";
import { DEFAULT_EDIT } from "../schema";
import { useMediaEditing } from "./use-media-editing";

vi.mock("../actions", () => ({ getMediaEditAction: vi.fn(), saveMediaEditAction: vi.fn() }));

const media: MediaDTO = {
  id: "ee6758c8-7fb9-4a03-9f6e-7ad930d7491e",
  kind: "fighter_body",
  width: 800,
  height: 1200,
  alt: "Boxeador",
  originalUrl: "https://media.example.cl/originals/fighter_body/example.png",
  variants: [],
  focal: { x: 0.5, y: 0.5 },
};

describe("useMediaEditing reopening a stored image", () => {
  const original = new Blob(["image bytes"], { type: "image/png" });
  const fetchImage = vi.fn<typeof fetch>();
  const createObjectUrl = vi.fn<typeof URL.createObjectURL>();
  const revokeObjectUrl = vi.fn<typeof URL.revokeObjectURL>();

  beforeEach(() => {
    vi.mocked(getMediaEditAction).mockResolvedValue({ data: DEFAULT_EDIT });
    fetchImage.mockReset().mockResolvedValue({ ok: true, blob: async () => original } as Response);
    createObjectUrl.mockReset().mockReturnValue("blob:editable-original");
    revokeObjectUrl.mockReset();
    vi.stubGlobal("fetch", fetchImage);
    vi.stubGlobal("URL", class extends URL {
      static createObjectURL = createObjectUrl;
      static revokeObjectURL = revokeObjectUrl;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens downloaded bytes rather than a remote image response cached without CORS", async () => {
    const { result } = renderHook(() => useMediaEditing("fighter_body", vi.fn()));

    await act(() => result.current.reopen(media));

    expect(fetchImage).toHaveBeenCalledWith(media.originalUrl, { cache: "reload" });
    expect(createObjectUrl).toHaveBeenCalledWith(original);
    expect(result.current.session).toEqual({
      mediaId: media.id,
      src: "blob:editable-original",
      natural: { w: 800, h: 1200 },
      initial: DEFAULT_EDIT,
    });

    act(() => result.current.cancel());
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:editable-original");
    expect(result.current.session).toBeNull();
  });

  it("keeps the editor closed and explains a failed download in Spanish", async () => {
    fetchImage.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useMediaEditing("fighter_body", vi.fn()));

    await act(() => result.current.reopen(media));

    expect(result.current.session).toBeNull();
    expect(result.current.phase).toEqual({ name: "idle" });
    expect(result.current.error).toBe("No se pudo cargar la imagen. Vuelve a intentarlo.");
    expect(createObjectUrl).not.toHaveBeenCalled();
  });
});

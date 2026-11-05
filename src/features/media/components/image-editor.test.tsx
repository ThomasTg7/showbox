// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaEdit } from "../schema";

type CropperProps = {
  aspect?: number;
  rotation?: number;
  zoom?: number;
  onCropComplete?: (area: unknown, pixels: { x: number; y: number; width: number; height: number }) => void;
};

const cropperProps: { current: CropperProps } = { current: {} };

vi.mock("react-easy-crop", () => ({
  default: (props: CropperProps) => {
    cropperProps.current = props;
    return <div data-testid="cropper" />;
  },
}));

const removeBackground = vi.fn<(file: Blob, onProgress?: (value: number) => void) => Promise<Blob>>();
vi.mock("../bg-removal/remove-background", () => ({
  removeBackground: (file: Blob, onProgress?: (value: number) => void) => removeBackground(file, onProgress),
}));

import { ImageEditor } from "./image-editor";

function renderEditor(overrides: Partial<ComponentProps<typeof ImageEditor>> = {}) {
  const onSave = vi.fn<(edit: MediaEdit) => void>();
  const onCancel = vi.fn();
  render(
    <ImageEditor
      kind="fighter_body"
      src="blob:test"
      natural={{ w: 1200, h: 1800 }}
      onSave={onSave}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSave, onCancel };
}

describe("ImageEditor", () => {
  beforeEach(() => {
    cropperProps.current = {};
  });

  afterEach(cleanup);

  it("uses the aspect ratio of the kind for the cropper", () => {
    renderEditor({ kind: "fighter_body" });

    expect(cropperProps.current.aspect).toBeCloseTo(2 / 3);
  });

  it("shows the recommended size, minimum and ratio", () => {
    renderEditor();

    expect(screen.getByText("Proporción 2:3 (vertical) · Recomendado: 1200×1800 px · Mínimo: 800×1200 px")).toBeInTheDocument();
  });

  it("warns when the image is smaller than the minimum", () => {
    renderEditor({ natural: { w: 700, h: 1050 } });

    expect(
      screen.getByText("La imagen es más chica que el mínimo recomendado (800×1200) y puede verse pixelada."),
    ).toBeInTheDocument();
  });

  it("does not warn when the image is large enough", () => {
    renderEditor();

    expect(screen.queryByText(/más chica que el mínimo/)).not.toBeInTheDocument();
  });

  it("rotates in 90° steps", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Girar a la derecha" }));
    expect(cropperProps.current.rotation).toBe(90);
    fireEvent.click(screen.getByRole("button", { name: "Girar a la izquierda" }));
    fireEvent.click(screen.getByRole("button", { name: "Girar a la izquierda" }));
    expect(cropperProps.current.rotation).toBe(270);
  });

  it("saves the crop, rotation, adjustments and alt text", () => {
    const { onSave } = renderEditor();

    cropperProps.current.onCropComplete?.({}, { x: 10, y: 20, width: 800, height: 1200 });
    fireEvent.change(screen.getByLabelText("Texto alternativo"), { target: { value: "Boxeador con guantes" } });
    fireEvent.change(screen.getByLabelText(/Brillo/), { target: { value: "1.2" } });
    fireEvent.change(screen.getByLabelText(/Nitidez/), { target: { value: "0.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar imagen" }));

    expect(onSave).toHaveBeenCalledWith({
      crop: { x: 10, y: 20, width: 800, height: 1200 },
      rotation: 0,
      focal: { x: 0.5, y: 0.5 },
      adjustments: { brightness: 1.2, contrast: 1, saturation: 1, sharpness: 0.5 },
      alt: "Boxeador con guantes",
    });
  });

  it("marks the focal point with a click in focus mode", () => {
    const { onSave } = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Punto de enfoque" }));
    const picker = screen.getByTestId("focal-picker");
    vi.spyOn(picker, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300, x: 0, y: 0, toJSON: () => ({}),
    });
    fireEvent.click(picker, { clientX: 50, clientY: 30 });
    fireEvent.click(screen.getByRole("button", { name: "Guardar imagen" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ focal: { x: 0.25, y: 0.1 } }));
  });

  it("moves the focal point with the arrow keys", () => {
    const { onSave } = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Punto de enfoque" }));
    fireEvent.keyDown(screen.getByTestId("focal-picker"), { key: "ArrowUp" });
    fireEvent.click(screen.getByRole("button", { name: "Guardar imagen" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ focal: { x: 0.5, y: 0.45 } }));
  });

  it("offers a free aspect ratio for gallery photos", () => {
    renderEditor({ kind: "gallery", natural: { w: 2400, h: 1600 } });

    expect(cropperProps.current.aspect).toBeCloseTo(3 / 2);
    fireEvent.change(screen.getByLabelText("Proporción del recorte"), { target: { value: "1" } });
    expect(cropperProps.current.aspect).toBe(1);
  });

  it("reopens a gallery photo with the ratio it was cropped to", () => {
    renderEditor({
      kind: "gallery",
      natural: { w: 2400, h: 1600 },
      initial: {
        crop: { x: 0, y: 0, width: 1600, height: 1600 },
        rotation: 0,
        focal: { x: 0.5, y: 0.5 },
        adjustments: { brightness: 1, contrast: 1, saturation: 1, sharpness: 0 },
        alt: "",
      },
    });

    expect(cropperProps.current.aspect).toBe(1);
    expect(screen.getByLabelText("Proporción del recorte")).toHaveValue("1");
  });

  it("does not offer a free aspect ratio for fixed kinds", () => {
    renderEditor({ kind: "fighter_body" });

    expect(screen.queryByLabelText("Proporción del recorte")).not.toBeInTheDocument();
  });

  it("calls onCancel", () => {
    const { onCancel } = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalled();
  });

  describe("remove background", () => {
    const original = new Blob(["foto"], { type: "image/jpeg" });

    beforeEach(() => {
      removeBackground.mockReset();
      vi.stubGlobal("fetch", vi.fn(async () => new Response(original)));
    });

    afterEach(() => vi.unstubAllGlobals());

    it("is only offered for fighter body photos", () => {
      renderEditor({ kind: "fighter_headshot", onBackgroundRemoved: vi.fn() });

      expect(screen.queryByRole("button", { name: "Quitar fondo" })).not.toBeInTheDocument();
    });

    it("hands the transparent PNG to the parent", async () => {
      const cutout = new Blob(["sin fondo"], { type: "image/png" });
      removeBackground.mockResolvedValue(cutout);
      const onBackgroundRemoved = vi.fn();
      renderEditor({ onBackgroundRemoved });

      fireEvent.click(screen.getByRole("button", { name: "Quitar fondo" }));

      await waitFor(() => expect(onBackgroundRemoved).toHaveBeenCalledWith(cutout));
      expect(removeBackground.mock.calls[0][0]).toBeInstanceOf(Blob);
    });

    it("shows the model download progress and then the processing state", async () => {
      let report: (value: number) => void = () => {};
      removeBackground.mockImplementation((_file, onProgress) => {
        report = onProgress ?? report;
        return new Promise(() => {});
      });
      renderEditor({ onBackgroundRemoved: vi.fn() });

      fireEvent.click(screen.getByRole("button", { name: "Quitar fondo" }));
      await screen.findByText("Descargando modelo (~25 MB)…");
      report(0.5);
      expect(await screen.findByText("Descargando modelo (~25 MB)… 50%")).toBeInTheDocument();
      report(1);
      expect(await screen.findByText("Quitando fondo…")).toBeInTheDocument();
    });

    it("shows an error message when it fails", async () => {
      removeBackground.mockRejectedValue(new Error("No se pudo quitar el fondo"));
      renderEditor({ onBackgroundRemoved: vi.fn() });

      fireEvent.click(screen.getByRole("button", { name: "Quitar fondo" }));

      expect(await screen.findByText("No se pudo quitar el fondo")).toBeInTheDocument();
    });
  });
});

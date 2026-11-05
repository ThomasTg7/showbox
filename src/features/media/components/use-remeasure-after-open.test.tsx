// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRemeasureAfterOpen, type Measurable } from "./use-remeasure-after-open";

afterEach(cleanup);

function Probe({ measurable }: { measurable: (container: HTMLDivElement | null) => Measurable }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cropperRef = useRef<Measurable | null>(null);
  useRemeasureAfterOpen(cropperRef);
  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        cropperRef.current = measurable(node);
      }}
      data-testid="stage"
    />
  );
}

describe("useRemeasureAfterOpen", () => {
  it("measures the crop stage again when the dialog finishes its opening animation", () => {
    const computeSizes = vi.fn();
    const { getByRole } = render(
      <div role="dialog">
        <Probe measurable={(container) => ({ containerRef: container, computeSizes })} />
      </div>,
    );

    fireEvent.animationEnd(getByRole("dialog"));
    expect(computeSizes).toHaveBeenCalledTimes(1);
  });

  it("ignores animations of elements inside the dialog", () => {
    const computeSizes = vi.fn();
    const { getByTestId } = render(
      <div role="dialog">
        <Probe measurable={(container) => ({ containerRef: container, computeSizes })} />
      </div>,
    );

    fireEvent.animationEnd(getByTestId("stage"));
    expect(computeSizes).not.toHaveBeenCalled();
  });
});

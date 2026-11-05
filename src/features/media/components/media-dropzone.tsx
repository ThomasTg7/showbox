"use client";

import { ImagePlus } from "lucide-react";
import { useId, useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";

type MediaDropzoneProps = {
  accept: string[];
  multiple?: boolean;
  disabled?: boolean;
  label: string;
  hint: string;
  onFiles: (files: File[]) => void;
};

/** Zona para soltar o elegir archivos. Es un `<label>`: sirve con teclado y con el selector de fotos del celular. */
export function MediaDropzone({ accept, multiple = false, disabled = false, label, hint, onFiles }: MediaDropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-border p-4 text-center transition-opacity focus-within:ring-3 focus-within:ring-ring/50 hover:border-primary",
        dragging && "border-primary bg-muted",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <ImagePlus aria-hidden className="size-8 text-accent-bright" />
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={accept.join(",")}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
    </label>
  );
}

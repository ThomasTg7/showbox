"use client";

import { Eraser, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { removeBackground } from "../bg-removal/remove-background";

type RemoveBackgroundButtonProps = {
  src: string;
  onDone: (cutout: Blob) => void;
};

type State = { status: "idle" } | { status: "working"; progress: number | null } | { status: "error"; message: string };

export function RemoveBackgroundButton({ src, onDone }: RemoveBackgroundButtonProps) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleClick() {
    // Antes de que llegue el primer aviso de progreso, lo más probable es que se esté bajando el modelo.
    setState({ status: "working", progress: 0 });
    try {
      const original = await (await fetch(src)).blob();
      const cutout = await removeBackground(original, (progress) => setState({ status: "working", progress }));
      setState({ status: "idle" });
      onDone(cutout);
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudo quitar el fondo" });
    }
  }

  const working = state.status === "working";

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="outline" className="w-full" disabled={working} onClick={handleClick}>
        {working ? <Loader2 aria-hidden className="animate-spin" /> : <Eraser aria-hidden />} Quitar fondo
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
        {working ? progressText(state.progress) : null}
      </p>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function progressText(progress: number | null): string {
  if (progress === null || progress >= 1) return "Quitando fondo…";
  if (progress <= 0) return "Descargando modelo (~25 MB)…";
  return `Descargando modelo (~25 MB)… ${Math.round(progress * 100)}%`;
}

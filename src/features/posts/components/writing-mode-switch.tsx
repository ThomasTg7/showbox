"use client";

import { PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export type WritingMode = "write" | "ai";

const MODES: { mode: WritingMode; label: string; detail: string; icon: typeof PenLine }[] = [
  { mode: "write", label: "Escribir", detail: "Escribe o pega el texto tú mismo", icon: PenLine },
  { mode: "ai", label: "Con IA", detail: "ChatGPT, Claude o Gemini la redactan", icon: Sparkles },
];

/** «Escribir» o «Con IA», cada uno con una línea que explica qué hace. */
export function WritingModeSwitch({ mode, onChange }: { mode: WritingMode; onChange: (mode: WritingMode) => void }) {
  return (
    <div role="group" aria-label="Cómo escribir la noticia" className="grid grid-cols-2 gap-2 sm:flex">
      {MODES.map(({ mode: option, label, detail, icon: Icon }) => (
        <Button
          key={option}
          type="button"
          variant={mode === option ? "default" : "outline"}
          aria-pressed={mode === option}
          aria-label={label}
          aria-describedby={`post-mode-${option}`}
          onClick={() => onChange(option)}
          className="h-auto min-h-11 flex-col items-start gap-0.5 py-2 text-left sm:min-w-56"
        >
          <span className="flex items-center gap-2">
            <Icon aria-hidden /> {label}
          </span>
          <span id={`post-mode-${option}`} className="text-xs font-normal whitespace-normal opacity-80">
            {detail}
          </span>
        </Button>
      ))}
    </div>
  );
}

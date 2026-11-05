"use client";
import { BRAND } from "@/domain/brand";

import { Copy, ExternalLink } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildAiPrompt } from "../../ai-prompt";
import { WizardStep } from "./wizard-step";

const AI_CHATS = [
  { name: "ChatGPT", href: "https://chatgpt.com/" },
  { name: "Claude", href: "https://claude.ai/new" },
  { name: "Gemini", href: "https://gemini.google.com/app" },
];

const FACTS_PLACEHOLDER = [
  `Ej.: ${BRAND.name} 5, sábado 12 de octubre en el Movistar Arena.`,
  "Pelea estelar: Pérez venció a Soto por KO en el segundo round y retuvo el cinturón peso pluma.",
  "Declaración de Pérez: «Este cinturón es para Valparaíso».",
  "Video del KO: https://youtu.be/…",
].join("\n");

type AiPromptStepProps = {
  facts: string;
  onFactsChange: (facts: string) => void;
  /** Qué muestra cada foto, en orden (FOTO 1, FOTO 2…). */
  photoDescriptions: string[];
};

/** Paso 2: contar qué pasó y copiar las instrucciones completas para pegarlas en una IA. */
export function AiPromptStep({ facts, onFactsChange, photoDescriptions }: AiPromptStepProps) {
  const factsId = useId();
  const prompt = buildAiPrompt({ facts, photos: photoDescriptions });

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Instrucciones copiadas. Abre tu IA, pégalas (Ctrl+V o mantén presionado) y envíalas.");
    } catch {
      toast.error("No se pudo copiar. Abre «Ver las instrucciones», selecciona el texto y cópialo a mano.");
    }
  }

  return (
    <WizardStep
      number={2}
      title="Cuéntale a la IA qué pasó"
      help={
        <>
          <p>Escribe los datos tal como los sabes, sin preocuparte de la redacción: quiénes, qué, cuándo, dónde, resultados y declaraciones.</p>
          <p>¿Quieres un video o una publicación en la noticia? Pega aquí su link de YouTube, Instagram, TikTok o Facebook.</p>
          <p>Después toca «Copiar instrucciones para la IA», abre ChatGPT, Claude o Gemini, pega y envía. Las instrucciones ya incluyen tus datos y lo que muestra cada foto.</p>
        </>
      }
    >
      <label htmlFor={factsId} className="text-sm font-medium">
        ¿Qué pasó?
      </label>
      <Textarea id={factsId} value={facts} onChange={(event) => onFactsChange(event.target.value)} rows={6} placeholder={FACTS_PLACEHOLDER} className="text-sm" />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button type="button" onClick={copyPrompt}>
          <Copy aria-hidden /> Copiar instrucciones para la IA
        </Button>
        <span className="text-sm text-muted-foreground">y pégalas en</span>
        <div className="flex flex-wrap gap-2">
          {AI_CHATS.map((chat) => (
            <Button key={chat.name} asChild variant="outline">
              <a href={chat.href} target="_blank" rel="noopener noreferrer">
                {chat.name} <ExternalLink aria-hidden />
              </a>
            </Button>
          ))}
        </div>
      </div>
      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-muted-foreground">Ver las instrucciones que se copian</summary>
        <pre data-slot="ai-prompt" tabIndex={0} className="max-h-72 overflow-y-auto border border-border bg-background p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {prompt}
        </pre>
      </details>
    </WizardStep>
  );
}

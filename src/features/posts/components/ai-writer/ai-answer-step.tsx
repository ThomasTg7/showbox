"use client";

import { Check, ClipboardCopy, FileInput, TriangleAlert } from "lucide-react";
import { useDeferredValue, useId, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parsePostMarkdown } from "@/domain/post-markdown";
import { summarizeDraft } from "../../draft-summary";
import { WizardStep } from "./wizard-step";

export type DraftNotices = { error?: string; warnings: string[] };

type AiAnswerStepProps = {
  answer: string;
  onAnswerChange: (answer: string) => void;
  photoIds: readonly string[];
  notices: DraftNotices;
  onLoad: () => void;
  onCopyCurrent: () => void;
};

/** Paso 3: pegar la respuesta, ver qué se detectó y cargarla. También «Copiar noticia para la IA», para pedir cambios. */
export function AiAnswerStep({ answer, onAnswerChange, photoIds, notices, onLoad, onCopyCurrent }: AiAnswerStepProps) {
  const answerId = useId();
  const summaryId = useId();
  // Leer la respuesta en cada tecla de un texto largo no debe trabar el cuadro de texto.
  const deferred = useDeferredValue(answer);
  const summary = useMemo(() => (deferred.trim() ? summarizeDraft(parsePostMarkdown(deferred, photoIds)) : []), [deferred, photoIds]);

  return (
    <WizardStep
      number={3}
      title="Pega la respuesta de la IA"
      help={
        <>
          <p>Copia la respuesta completa de la IA (el botón de copiar bajo su mensaje) y pégala aquí.</p>
          <p>Abajo verás lo que se detectó: título, bajada, fotos y videos. Toca «Cargar en la noticia» y revísala en «Escribir» y en la vista previa.</p>
          <p>¿Quieres cambiar algo? Pídeselo a la IA («hazla más corta») y vuelve a pegar su respuesta. Si corregiste a mano, toca «Copiar noticia para la IA» y pégasela junto con tu pedido.</p>
        </>
      }
    >
      <label htmlFor={answerId} className="text-sm font-medium">
        Respuesta de la IA
      </label>
      <Textarea
        id={answerId}
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        rows={10}
        placeholder={"TÍTULO: …\nBAJADA: …\n\nPrimer párrafo de la noticia…"}
        aria-invalid={notices.error ? true : undefined}
        aria-describedby={summary.length > 0 ? summaryId : undefined}
        className="text-sm"
      />
      {summary.length > 0 ? (
        <ul id={summaryId} aria-label="Lo que se cargará" className="flex flex-col gap-1 text-sm">
          {summary.map((item) => (
            <li key={item.text} className={`flex items-start gap-2 ${item.ok ? "" : "text-amber-300"}`}>
              {item.ok ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-bright" /> : <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
              <span className="min-w-0 break-words">{item.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">Reemplaza el texto actual de la noticia (puedes deshacerlo).</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={onLoad}>
          <FileInput aria-hidden /> Cargar en la noticia
        </Button>
        <Button type="button" variant="outline" onClick={onCopyCurrent}>
          <ClipboardCopy aria-hidden /> Copiar noticia para la IA
        </Button>
      </div>

      {notices.error ? (
        <p role="alert" className="text-sm text-destructive">
          {notices.error}
        </p>
      ) : null}
      {notices.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-amber-300">
          {notices.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </WizardStep>
  );
}

"use client";

import type { Editor } from "@tiptap/react";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseEmbedUrl } from "@/domain/embed";
import { isSafeHref, withProtocol } from "@/domain/post-body";

type PanelProps = { editor: Editor; onClose: () => void };

/**
 * Estos paneles van dentro del formulario de la noticia: no pueden ser un `<form>` (no se anidan, y el envío guardaría
 * la noticia). Enter hace lo mismo que el botón principal.
 */
function submitOnEnter(event: KeyboardEvent<HTMLInputElement>, submit: () => void) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  submit();
}

/** Poner o quitar el enlace del texto seleccionado. */
export function LinkPanel({ editor, onClose }: PanelProps) {
  const [url, setUrl] = useState(() => (editor.getAttributes("link").href as string | undefined) ?? "");
  const [error, setError] = useState<string | null>(null);
  const hasLink = editor.isActive("link");

  function apply() {
    const href = withProtocol(url.trim());
    if (!url.trim() || !isSafeHref(href)) {
      setError("Escribe un enlace válido (https://…).");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  return (
    <div role="group" aria-label="Enlace" className="flex flex-col gap-2 border-b border-border bg-card p-3">
      <label htmlFor="post-link-url" className="text-sm font-medium">
        Enlace del texto seleccionado
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="post-link-url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          type="url"
          inputMode="url"
          placeholder="https://…"
          autoComplete="off"
          autoCapitalize="none"
          onKeyDown={(event) => submitOnEnter(event, apply)}
          aria-invalid={error ? true : undefined}
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <Button type="button" onClick={apply}>
            Aplicar
          </Button>
          {hasLink ? (
            <Button type="button" variant="outline" onClick={remove}>
              Quitar enlace
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Selecciona primero el texto que será el enlace.</p>
      )}
    </div>
  );
}

/** Pegar el link de una publicación de Instagram, YouTube, TikTok o Facebook. */
export function EmbedPanel({ editor, onClose }: PanelProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function insert() {
    const embed = parseEmbedUrl(url);
    if (!embed) {
      setError("Link no reconocido. Pega el link de un video o publicación de YouTube, Instagram, TikTok o Facebook (no el de una página o perfil).");
      return;
    }
    editor.chain().focus().insertContent({ type: "embed", attrs: embed }).run();
    onClose();
  }

  return (
    <div role="group" aria-label="Publicación de una red social" className="flex flex-col gap-2 border-b border-border bg-card p-3">
      <label htmlFor="post-embed-url" className="text-sm font-medium">
        Link de YouTube, Instagram, TikTok o Facebook
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="post-embed-url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          type="url"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          autoComplete="off"
          autoCapitalize="none"
          onKeyDown={(event) => submitOnEnter(event, insert)}
          aria-invalid={error ? true : undefined}
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <Button type="button" onClick={insert}>
            Insertar
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">En «Compartir», toca «Copiar enlace» y pégalo aquí. También puedes pegarlo directo en el texto.</p>
      )}
    </div>
  );
}

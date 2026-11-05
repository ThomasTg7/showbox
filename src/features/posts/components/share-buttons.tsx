"use client";

import { Check, Link as LinkIcon, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

type ShareButtonsProps = {
  /** Dirección absoluta de la noticia (con el dominio del sitio). */
  url: string;
  title: string;
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center gap-2 border border-white/30 px-4 font-cond text-sm font-extrabold uppercase tracking-[.08em] text-white transition-opacity hover:border-brand hover:bg-brand hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright";

const COPIED_MESSAGE_MS = 2500;

/** WhatsApp, X, Facebook y copiar el link (avisa «Link copiado»). Los enlaces salen sin pasar el control de la pestaña. */
export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), COPIED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copiado");
    } catch {
      setMessage("No se pudo copiar el link. Cópialo desde la barra del navegador.");
    }
  }

  const external = { target: "_blank", rel: "noopener noreferrer", className: BUTTON_CLASS } as const;

  return (
    <div className="flex flex-col gap-3">
      <p className="font-cond text-[13px] font-extrabold uppercase tracking-[.2em] text-accent-bright">Compartir</p>
      <div className="flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} aria-label="Compartir en WhatsApp" {...external}>
          <MessageCircle aria-hidden className="size-4" /> WhatsApp
        </a>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`} aria-label="Compartir en X" {...external}>
          <Share2 aria-hidden className="size-4" /> X
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} aria-label="Compartir en Facebook" {...external}>
          <Share2 aria-hidden className="size-4" /> Facebook
        </a>
        <button type="button" onClick={copy} aria-label="Copiar link" className={BUTTON_CLASS}>
          {message === "Link copiado" ? <Check aria-hidden className="size-4" /> : <LinkIcon aria-hidden className="size-4" />} Copiar link
        </button>
      </div>
      {/* Siempre en el HTML (vacío hasta copiar): así el lector de pantalla anuncia el cambio. */}
      <p role="status" aria-live="polite" className="min-h-5 font-cond text-sm font-bold uppercase tracking-[.08em] text-accent-bright">
        {message}
      </p>
    </div>
  );
}

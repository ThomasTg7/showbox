"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { youtubeEmbedUrl } from "../public-format";

type EventVideoProps = {
  /** Enlace de la transmisión o del video (`https://…`). */
  url: string;
  title: string;
};

/**
 * Video del evento. Un enlace de YouTube se muestra como una portada con botón «Reproducir»: el reproductor (que
 * carga scripts y cookies de terceros) solo se descarga al tocarla. Cualquier otro enlace sale como botón a otra pestaña.
 */
export function EventVideo({ url, title }: EventVideoProps) {
  const [playing, setPlaying] = useState(false);
  const embed = youtubeEmbedUrl(url);

  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-white px-6 py-3.5 font-cond text-[15px] font-extrabold uppercase tracking-[.08em] text-white hover:bg-white hover:text-black">
        {title} <ExternalLink aria-hidden className="size-4" />
      </a>
    );
  }

  return (
    <div className="relative aspect-video w-full max-w-4xl overflow-hidden border border-border bg-surface">
      {playing ? (
        <iframe title={title} src={`${embed}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 size-full" />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_center,#2a1f06,#0b0b0b_70%)] outline-none focus-visible:ring-2 focus-visible:ring-accent-bright">
          <span className="grid size-16 place-items-center rounded-full border-2 border-white transition-opacity group-hover:border-brand group-hover:bg-brand group-hover:text-white">
            <Play aria-hidden className="ml-1 size-7 fill-current" />
          </span>
          <span className="font-cond text-lg font-extrabold uppercase tracking-[.1em] text-white">{title}</span>
        </button>
      )}
    </div>
  );
}

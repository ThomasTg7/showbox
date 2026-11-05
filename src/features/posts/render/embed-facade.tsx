"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { embedCanonicalUrl, embedSrc, isVerticalEmbed, youtubeThumbnailUrl, type Embed, type EmbedProvider } from "@/domain/embed";
import { EMBED_FRAME_ATTRIBUTES, EMBED_PROVIDER_NAME, embedFrameClass } from "../embed-frame";

const COLUMN_FACADE_CLASS: Record<EmbedProvider, string> = {
  youtube: "mx-auto min-h-72 w-full max-w-[540px]",
  instagram: "mx-auto min-h-72 w-full max-w-[540px]",
  tiktok: "mx-auto min-h-72 w-full max-w-[340px]",
  facebook: "mx-auto min-h-72 w-full max-w-[500px]",
};

const PLAY_BADGE_CLASS =
  "flex size-16 items-center justify-center bg-brand text-white shadow-lg transition-transform duration-200 motion-safe:group-hover:scale-110 sm:size-20";

/** YouTube: la imagen fija del video y un «play» grande; al tocarlo, el video empieza ahí mismo. */
function YouTubePoster({ embed, onPlay }: { embed: Embed; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label="Reproducir video de YouTube"
      className="group relative block aspect-video w-full overflow-hidden bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen fija de YouTube (i.ytimg.com, sin cookies); next/image la volvería a pedir y procesar */}
      <img src={youtubeThumbnailUrl(embed.id)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
      <span aria-hidden className="absolute top-3 left-3 bg-black/80 px-2 py-1 font-cond text-xs font-extrabold tracking-[0.14em] text-white uppercase">
        YouTube
      </span>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
        <span className={PLAY_BADGE_CLASS}>
          <Play className="size-7 translate-x-0.5 fill-current sm:size-9" />
        </span>
      </span>
    </button>
  );
}

/** Instagram, TikTok y Facebook no tienen una imagen pública para mostrar antes: un recuadro de la marca y un botón. */
function NetworkCard({ embed, onPlay }: { embed: Embed; onPlay: () => void }) {
  const name = EMBED_PROVIDER_NAME[embed.provider];
  const sizeClass = isVerticalEmbed(embed) ? COLUMN_FACADE_CLASS[embed.provider] : "aspect-video w-full";
  return (
    <div className={`${sizeClass} flex flex-col items-center justify-center gap-5 border border-border bg-surface bg-[radial-gradient(circle_at_50%_35%,rgb(255_180_0/0.12),transparent_65%)] px-4 py-10 text-center`}>
      <span className="font-display text-4xl tracking-wide text-white uppercase sm:text-5xl">{name}</span>
      <span className="font-cond text-sm font-bold tracking-[0.14em] text-white/70 uppercase">{isVerticalEmbed(embed) ? "Publicación" : "Video"}</span>
      <button
        type="button"
        onClick={onPlay}
        className="inline-flex min-h-12 items-center gap-2 bg-brand px-6 font-cond text-base font-extrabold tracking-[0.08em] text-white uppercase transition-opacity hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Play aria-hidden className="size-4 fill-current" /> Ver en {name}
      </button>
      <p className="max-w-xs text-sm text-white/60">Al verla se cargará contenido de {name}, que puede usar cookies.</p>
    </div>
  );
}

/**
 * Publicación de YouTube, Instagram, TikTok o Facebook. Hasta que la persona la pide no se carga el reproductor de la
 * red (ni sus cookies): YouTube muestra la imagen fija del video y el resto un recuadro con un botón. Al tocar, el
 * reproductor aparece en el mismo lugar (el video de YouTube empieza solo).
 */
export function EmbedFacade({ embed }: { embed: Embed }) {
  const [loaded, setLoaded] = useState(false);
  const name = EMBED_PROVIDER_NAME[embed.provider];
  const play = () => setLoaded(true);

  return (
    <div className="my-8 flex flex-col gap-2">
      {loaded ? (
        <iframe
          src={embedSrc(embed, { autoplay: true })}
          title={`Publicación de ${name}`}
          className={`${embedFrameClass(embed)} border-0 bg-surface`}
          loading="lazy"
          allowFullScreen
          {...EMBED_FRAME_ATTRIBUTES}
        />
      ) : embed.provider === "youtube" ? (
        <YouTubePoster embed={embed} onPlay={play} />
      ) : (
        <NetworkCard embed={embed} onPlay={play} />
      )}
      <a
        href={embedCanonicalUrl(embed)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 self-center px-2 text-sm text-white/70 underline underline-offset-4 hover:text-accent-bright"
      >
        Abrir en {name} <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </div>
  );
}

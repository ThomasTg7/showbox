"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Header } from "@/components/site/header";
import type { PostDTO } from "../../dto";
import { isLivePreviewMessage, LIVE_PREVIEW_READY } from "../../live-preview";
import { PostArticle } from "../post-article";

/** Dentro de la vista previa los enlaces no navegan: el `iframe` dejaría de mostrar la noticia. */
function blockNavigation(event: MouseEvent<HTMLDivElement>) {
  if ((event.target as HTMLElement).closest("a")) event.preventDefault();
}

/**
 * Lado de adentro de la vista previa en vivo: espera la noticia del formulario (solo de la ventana que la contiene y
 * del mismo origen) y la dibuja con el encabezado del sitio y `PostArticle`, igual que la página pública.
 */
export function PostLivePreviewFrame({ shareUrl }: { shareUrl: string }) {
  const [post, setPost] = useState<PostDTO | null>(null);

  useEffect(() => {
    // The iframe can hydrate before its parent attaches the message listener.
    const requestPost = () => window.parent.postMessage({ type: LIVE_PREVIEW_READY }, window.location.origin);
    const retry = window.setInterval(requestPost, 250);
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent || !isLivePreviewMessage(event.data)) return;
      window.clearInterval(retry);
      setPost(event.data.post);
    }
    window.addEventListener("message", receive);
    requestPost();
    return () => {
      window.clearInterval(retry);
      window.removeEventListener("message", receive);
    };
  }, []);

  if (!post) {
    return <p className="p-6 font-cond text-sm font-bold uppercase tracking-[.1em] text-muted-foreground">Cargando vista previa…</p>;
  }

  return (
    <div onClickCapture={blockNavigation} className="sb-site flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <article>
          <PostArticle post={post} shareUrl={shareUrl} />
        </article>
      </main>
    </div>
  );
}

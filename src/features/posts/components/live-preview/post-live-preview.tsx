"use client";

import { Eye, EyeOff, Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { adminPath } from "@/lib/site-urls";
import type { PostDTO } from "../../dto";
import { LIVE_PREVIEW_MESSAGE, LIVE_PREVIEW_READY } from "../../live-preview";

/** Tamaño real de cada pantalla: el `iframe` mide eso y se achica con `scale` si no cabe (el diseño responde a su ancho). */
const DEVICES = {
  mobile: { label: "Celular", width: 375, height: 760, icon: Smartphone },
  desktop: { label: "PC", width: 1440, height: 900, icon: Monitor },
} as const;
type Device = keyof typeof DEVICES;

/** Espera entre teclazos antes de redibujar: escribir rápido no redibuja la noticia en cada letra. */
const SEND_DELAY_MS = 150;

/** Ancho disponible del contenedor (se recalcula al cambiar el tamaño de la ventana o del panel). */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** «Vista previa en vivo» bajo el formulario: la noticia como en el sitio, en celular o en PC, mientras se edita. */
export function PostLivePreview({ post }: { post: PostDTO }) {
  const [device, setDevice] = useState<Device>("mobile");
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin === window.location.origin && event.source === frameRef.current?.contentWindow && event.data?.type === LIVE_PREVIEW_READY) {
        // Reply even when already ready: an iframe reload loses its previous content.
        frameRef.current?.contentWindow?.postMessage({ type: LIVE_PREVIEW_MESSAGE, post }, window.location.origin);
        setReady(true);
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [post]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => frameRef.current?.contentWindow?.postMessage({ type: LIVE_PREVIEW_MESSAGE, post }, window.location.origin), SEND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [post, ready]);

  const screen = DEVICES[device];
  const scale = width > 0 ? Math.min(1, width / screen.width) : 1;

  function toggle() {
    // Al volver a abrirla, el `iframe` se monta de nuevo y vuelve a avisar que está listo.
    setReady(false);
    setOpen((current) => !current);
  }

  return (
    <section aria-labelledby="post-live-preview-title" data-slot="post-live-preview" className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="post-live-preview-title" className="text-lg font-semibold">
            Vista previa en vivo
          </h2>
          <p className="text-sm text-muted-foreground">Así se verá en el sitio. Boxeadores y eventos relacionados aparecen al guardar.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(DEVICES) as Device[]).map((key) => {
            const { label, icon: Icon } = DEVICES[key];
            return (
              <Button key={key} type="button" variant={device === key ? "default" : "outline"} aria-pressed={device === key} onClick={() => setDevice(key)} disabled={!open}>
                <Icon aria-hidden /> {label}
              </Button>
            );
          })}
          <Button type="button" variant="ghost" aria-expanded={open} aria-controls="post-live-preview-box" onClick={toggle}>
            {open ? <EyeOff aria-hidden /> : <Eye aria-hidden />} {open ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
      </div>
      <div id="post-live-preview-box" ref={boxRef} hidden={!open} className="w-full overflow-hidden">
        {open ? (
          <div className="mx-auto overflow-hidden border border-border" style={{ width: screen.width * scale, height: screen.height * scale }}>
            <iframe
              ref={frameRef}
              src={adminPath("/vista-previa-noticia")}
              title={`Vista previa de la noticia en ${screen.label.toLowerCase()}`}
              className="origin-top-left border-0 bg-background"
              style={{ width: screen.width, height: screen.height, transform: `scale(${scale})` }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

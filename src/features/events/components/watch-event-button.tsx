"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MediaImage } from "@/components/media/media-image";
import { useLenis } from "@/components/motion/smooth-scroll";
import { Button } from "@/components/ui-gc/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { WatchPlatformDTO } from "../dto";

export function WatchEventButton({ eventName, platforms = [], children = "Ver", className, ariaLabel = "Ver" }: {
  eventName: string; platforms?: WatchPlatformDTO[]; children?: ReactNode; className?: string; ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const lenis = useLenis();
  useEffect(() => {
    if (!open || !lenis) return;
    lenis.stop();
    return () => { lenis.start(); };
  }, [open, lenis]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" variant="primary" className={className} aria-label={ariaLabel}>{children}</Button></DialogTrigger>
    <DialogContent data-lenis-prevent overlayClassName="sb-watch-overlay z-[190] bg-black/80" className="sb-site sb-watch-dialog z-[200] max-h-[85dvh] overflow-y-auto rounded-none border border-border bg-surface p-6 text-white sm:max-w-xl">
      <DialogTitle className="pr-8 font-display text-3xl uppercase sb-gradient-text">Dónde ver</DialogTitle>
      <DialogDescription className="text-white/70">{eventName} · Elige tu plataforma para ver la transmisión.</DialogDescription>
      {platforms.length ? <ul className="flex flex-col gap-4">
        {platforms.map((platform, index) => <li key={`${platform.url}-${index}`} className="flex flex-col items-center gap-4 border border-border bg-black/40 p-5 text-center sm:flex-row sm:text-left">
          {platform.media ? <MediaImage media={{ ...platform.media, alt: platform.media.alt || platform.name }} sizes="96px" className="h-20 w-24 shrink-0 object-contain" /> : null}
          <p className="min-w-0 flex-1 break-words font-cond text-2xl font-bold uppercase">{platform.name}</p>
          <Button asChild variant="primary" className="w-full shrink-0 px-5 sm:w-auto"><a href={platform.url} target="_blank" rel="noopener noreferrer" aria-label={`Ir a ver en ${platform.name}`}>Ir a ver</a></Button>
        </li>)}
      </ul> : <p className="border border-dashed border-border p-5 text-white/80">Pronto anunciaremos dónde ver este evento.</p>}
    </DialogContent>
  </Dialog>;
}

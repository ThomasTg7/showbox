import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play, Ticket } from "lucide-react";
import { SmoothAnchor } from "@/components/motion/smooth-anchor";
import { Button } from "@/components/ui-gc/button";
import { cn } from "@/lib/cn";
import type { WatchPlatformDTO } from "../dto";
import { WatchEventButton } from "./watch-event-button";

type EventActionsProps = {
  eventName: string;
  detailsHref: string;
  detailsLabel?: string;
  ticketHref?: string;
  ticketExternal?: boolean;
  platforms?: WatchPlatformDTO[];
  tone?: "dark" | "light";
  className?: string;
  layout?: "default" | "hero";
};

/** Cards end with broadcast options; covers end with the complete fight card. */
export function EventActions({ eventName, detailsHref, detailsLabel = "Ver evento", ticketHref, ticketExternal = false, platforms = [], tone = "dark", className, layout = "default" }: EventActionsProps) {
  const detailContent = <><span>{detailsLabel}</span><ArrowRight aria-hidden="true" size={17} /></>;
  const details = <Button asChild variant="ghost" className={cn("sb-event-action", (layout === "hero" || !ticketHref) && "col-span-2")}>
    {detailsHref.startsWith("#") ? <SmoothAnchor href={detailsHref as `#${string}`}>{detailContent}</SmoothAnchor> : <Link href={detailsHref}>{detailContent}</Link>}
  </Button>;
  const watch = <WatchEventButton eventName={eventName} platforms={platforms} ariaLabel="Dónde ver" className={cn("sb-event-action", (layout !== "hero" || !ticketHref) && "col-span-2")}>
    <span className="inline-flex items-center gap-2"><Play aria-hidden="true" size={16} />Dónde ver</span><ArrowUpRight aria-hidden="true" size={17} />
  </WatchEventButton>;
  return (
    <div data-slot="event-actions" data-tone={tone} className={cn("grid w-full grid-cols-2 gap-2.5", className)}>
      {layout === "hero" ? watch : details}
      {ticketHref ? <Button asChild variant="ghost" className="sb-event-action">
        <a href={ticketHref} aria-label="Comprar entradas" {...(ticketExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <span className="inline-flex items-center gap-2"><Ticket aria-hidden="true" size={17} />Entradas</span><ArrowUpRight aria-hidden="true" size={17} />
        </a>
      </Button> : null}
      {layout === "hero" ? details : watch}
    </div>
  );
}

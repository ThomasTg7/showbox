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
};

/** One consistent event action group: two destinations, then a full-width broadcast control. */
export function EventActions({ eventName, detailsHref, detailsLabel = "Ver evento", ticketHref, ticketExternal = false, platforms = [], tone = "dark", className }: EventActionsProps) {
  const detailContent = <><span>{detailsLabel}</span><ArrowRight aria-hidden="true" size={17} /></>;
  return (
    <div data-slot="event-actions" data-tone={tone} className={cn("grid w-full grid-cols-2 gap-2.5", className)}>
      <Button asChild variant="ghost" className={cn("sb-event-action", !ticketHref && "col-span-2")}>
        {detailsHref.startsWith("#") ? <SmoothAnchor href={detailsHref as `#${string}`}>{detailContent}</SmoothAnchor> : <Link href={detailsHref}>{detailContent}</Link>}
      </Button>
      {ticketHref ? <Button asChild variant="ghost" className="sb-event-action">
        <a href={ticketHref} aria-label="Comprar entradas" {...(ticketExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <span className="inline-flex items-center gap-2"><Ticket aria-hidden="true" size={17} />Entradas</span><ArrowUpRight aria-hidden="true" size={17} />
        </a>
      </Button> : null}
      <WatchEventButton eventName={eventName} platforms={platforms} ariaLabel="Dónde ver" className="sb-event-action col-span-2">
        <span className="inline-flex items-center gap-2"><Play aria-hidden="true" size={16} />Dónde ver</span><ArrowUpRight aria-hidden="true" size={17} />
      </WatchEventButton>
    </div>
  );
}

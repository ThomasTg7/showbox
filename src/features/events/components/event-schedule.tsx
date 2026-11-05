import { formatTime } from "@/lib/format-date";
import type { EventPageDTO } from "../dto";

type ScheduleItem = { label: string; value: string };

/** Horarios de la velada (puertas, cada bloque con hora, término estimado) y el recinto, con el estilo de `card-meta` de la maqueta. */
export function EventSchedule({ event }: { event: EventPageDTO }) {
  const items: ScheduleItem[] = [];
  if (event.doorsAt) items.push({ label: "Apertura de puertas", value: `${formatTime(new Date(event.doorsAt))} hrs` });
  const timed = event.segments.filter((segment) => segment.startsAt !== null).sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());
  for (const segment of timed) items.push({ label: segment.name, value: `${formatTime(new Date(segment.startsAt!))} hrs` });
  if (event.endsEstimatedAt) items.push({ label: "Término estimado", value: `${formatTime(new Date(event.endsEstimatedAt))} hrs` });
  items.push({ label: "Lugar", value: [event.venue.name, event.venue.address].filter(Boolean).join(" · ") });

  return (
    <dl data-slot="event-schedule" className="mt-9 flex flex-wrap gap-x-7 gap-y-5 font-cond text-[15px] font-bold uppercase tracking-[.08em] text-black">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-bold tracking-[.14em] text-neutral-500">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

import { Calendar, MapPin } from "lucide-react";
import { FakeQr } from "@/components/fake-qr";
import { categoryName, cityName } from "@/lib/catalog";
import { formatPrice, formatRange, paymentLabel } from "@/lib/format";
import type { TicketRecord } from "@/lib/types";

export function TicketView({ ticket }: { ticket: TicketRecord }) {
  const { event } = ticket;
  return (
    <article className="overflow-hidden rounded-xl bg-surface shadow-card">
      <img
        src={event.coverUrl}
        alt={event.title}
        className="aspect-2/1 w-full object-cover"
      />
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {categoryName(event.category)} · {cityName(event.city)}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold leading-tight tracking-tight">
          {event.title}
        </h2>
        <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
          <p className="flex items-start gap-2">
            <Calendar className="mt-0.5 size-4 shrink-0" />
            {formatRange(event.startsAt, event.endsAt, event.currency)}
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {event.venue}
          </p>
        </div>
      </div>
      <div className="relative px-4">
        <div className="ticket-dash h-px" />
        <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-paper" />
        <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-paper" />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 p-4">
        <div className="text-sm">
          <p className="text-muted">持票人</p>
          <p className="font-medium">{ticket.nickname}</p>
          <p className="mt-2 text-muted">人数 / 金额</p>
          <p className="font-medium tabular-nums">
            {ticket.seats} 人 · {formatPrice(ticket.amount, ticket.currency)}
          </p>
          <p className="mt-2 text-muted">支付</p>
          <p className="font-medium">{paymentLabel(ticket.paymentMethod)}</p>
          <p className="mt-3 font-mono text-xs tracking-[0.18em] text-ink">
            {ticket.code}
          </p>
        </div>
        <div className="size-28 overflow-hidden rounded-md">
          <FakeQr seed={ticket.code} className="size-full" />
        </div>
      </div>
    </article>
  );
}

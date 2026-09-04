import { forwardRef } from "react";
import { Calendar, MapPin } from "lucide-react";
import { TicketQr } from "@/components/ticket-qr";
import { categoryName, cityName } from "@/lib/catalog";
import { applyStatusLabel, formatPrice, formatRange, isApplySuccess, paymentLabel } from "@/lib/format";
import type { TicketRecord } from "@/lib/types";

export const TicketView = forwardRef<HTMLElement, { ticket: TicketRecord }>(function TicketView(
  { ticket },
  ref,
) {
  const { event } = ticket;
  const success = isApplySuccess(ticket.paymentStatus) && event.status !== "cancelled";
  const badge = success
    ? "报名成功"
    : applyStatusLabel(ticket.paymentStatus === "cancelled" ? "cancelled" : ticket.paymentStatus);
  return (
    <article ref={ref} data-ticket-card="1" className="overflow-hidden rounded-xl bg-surface shadow-card">
      <div className="h-1.5 bg-lime" />
      <div className="relative aspect-2/1 overflow-hidden bg-paper-2">
        <img
          src={event.coverUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted">Jom 出门局</p>
          <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-ink">
            {badge}
          </span>
        </div>
        <p className="mt-2 text-xs font-medium text-muted">
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
        {!success && ticket.cancelReason ? (
          <p className="mt-3 text-sm text-danger">{ticket.cancelReason}</p>
        ) : null}
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
            {ticket.applyNo || ticket.code}
          </p>
        </div>
        <div className="size-28 overflow-hidden rounded-md bg-paper">
          {ticket.verifyUrl ? <TicketQr value={ticket.verifyUrl} className="size-full" /> : null}
        </div>
      </div>
    </article>
  );
});

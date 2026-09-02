import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TicketView } from "@/components/ticket-view";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isApplySuccess } from "@/lib/format";
import { getTicketByCode, listMyApplications } from "@/lib/server/events";
import { useAppStore } from "@/lib/store";
import type { TicketRecord } from "@/lib/types";

export const Route = createFileRoute("/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const { user } = useCurrentUserState();
  const codes = useAppStore((s) => s.ticketCodes);
  const applyCodes = useAppStore((s) => s.applyCodes);
  const [tickets, setTickets] = useState<TicketRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const allCodes = [...new Set([...codes, ...applyCodes])];
      const fromStore = await Promise.all(
        allCodes.map((code) => getTicketByCode({ data: { code } })),
      );
      let mine: TicketRecord[] = [];
      if (user) {
        try {
          mine = await listMyApplications();
        } catch {
          mine = [];
        }
      }
      const map = new Map<string, TicketRecord>();
      for (const row of [...fromStore, ...mine]) {
        if (row && isApplySuccess(row.paymentStatus)) map.set(row.code, row);
      }
      if (!cancelled) setTickets([...map.values()]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [codes, applyCodes, user]);

  return (
    <main className="px-4 pb-8">
      <header className="pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to="/me" className="mb-2 flex items-center gap-1 text-sm text-muted">
          <ArrowLeft className="size-4" />
          我的
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">票夹</h1>
        <p className="mt-1 text-sm text-muted">只有管理员同意后才会出现在这里。</p>
      </header>

      {tickets === null ? (
        <div className="mt-6 space-y-3">
          <div className="h-48 animate-pulse rounded-xl bg-surface" />
          <div className="h-48 animate-pulse rounded-xl bg-surface" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="mt-10 rounded-xl bg-surface px-5 py-12 text-center shadow-card">
          <p className="font-display text-lg font-semibold">还没有票</p>
          <p className="mt-1 text-sm text-muted">提交申请并等发起人同意后，票会留在这里。</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link to="/me/applies">我的申请</Link>
            </Button>
            <Button asChild>
              <Link to="/">去发现</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {tickets.map((ticket) => (
            <Link
              key={ticket.code}
              to="/ticket/$code"
              params={{ code: ticket.code }}
              className="block"
            >
              <TicketView ticket={ticket} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

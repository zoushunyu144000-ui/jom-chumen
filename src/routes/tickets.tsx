import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageLoading } from "@/components/page-loading";
import { ShareableTicket } from "@/components/ticket-share";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMyTickets } from "@/lib/server/ticket-list";
import type { TicketRecord } from "@/lib/types";

export const Route = createFileRoute("/tickets")({ component: TicketsPage });

function TicketsPage() {
  const { user, isPending } = useCurrentUserState();
  const [tickets, setTickets] = useState<TicketRecord[] | null>(null);

  useEffect(() => {
    if (!user) {
      if (!isPending) setTickets([]);
      return;
    }
    listMyTickets().then(setTickets).catch(() => setTickets([]));
  }, [user, isPending]);

  return (
    <main className="px-4 pb-8">
      <header className="pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to="/me" className="mb-2 flex items-center gap-1 text-sm text-muted">
          <ArrowLeft className="size-4" />我的
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">票夹</h1>
        <p className="mt-1 text-sm text-muted">只有管理员同意后才会出现在这里。</p>
      </header>
      {tickets === null ? (
        <PageLoading label="正在打开票夹" />
      ) : tickets.length === 0 ? (
        <div className="mt-10 rounded-xl bg-surface px-5 py-12 text-center shadow-card">
          <p className="font-display text-lg font-semibold">还没有票</p>
          <p className="mt-1 text-sm text-muted">提交申请并等发起人同意后，票会留在这里。</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button asChild variant="outline"><Link to="/me/applies">我的申请</Link></Button>
            <Button asChild><Link to="/">去发现</Link></Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {tickets.map((ticket) => (
            <ShareableTicket key={ticket.code} ticket={ticket} />
          ))}
        </div>
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { applyStatusLabel, formatWhen, isApplySuccess } from "@/lib/format";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getTicketByCode, listMyApplications } from "@/lib/server/events";
import { useAppStore } from "@/lib/store";
import type { TicketRecord } from "@/lib/types";

export const Route = createFileRoute("/me/applies")({ component: AppliesPage });

function AppliesPage() {
  const { user } = useCurrentUserState();
  const applyCodes = useAppStore((s) => s.applyCodes);
  const ticketCodes = useAppStore((s) => s.ticketCodes);
  const [rows, setRows] = useState<TicketRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const codes = [...new Set([...applyCodes, ...ticketCodes])];
      const fromStore: TicketRecord[] = [];
      let mine: TicketRecord[] = [];
      if (user) {
        const found = await Promise.all(
          codes.map((code) => getTicketByCode({ data: { code } }).catch(() => null)),
        );
        fromStore.push(...found.filter((row): row is TicketRecord => Boolean(row)));
        try {
          mine = await listMyApplications();
        } catch {
          mine = [];
        }
      }
      const map = new Map<string, TicketRecord>();
      for (const row of [...fromStore, ...mine]) {
        if (row) map.set(row.code, row);
      }
      if (!cancelled) setRows([...map.values()]);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [applyCodes, ticketCodes, user]);

  return (
    <main className="px-4 pb-10">
      <header className="pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to="/me" className="mb-2 flex items-center gap-1 text-sm text-muted">
          <ArrowLeft className="size-4" />
          我的
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">我的申请</h1>
        <p className="mt-1 text-sm text-muted">提交不等于成功，管理员同意后才会出票。</p>
      </header>
      {rows === null ? (
        <p className="mt-6 text-sm text-muted">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">还没有申请。去发现页报一场。</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <a
                href={
                  isApplySuccess(row.paymentStatus)
                    ? `/ticket/${row.code}`
                    : `/apply/${row.code}`
                }
                className="block rounded-xl bg-surface p-3 shadow-card"
              >
                <p className="font-medium">{row.applyNo}</p>
                <p className="text-sm text-muted">{row.event.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {applyStatusLabel(row.paymentStatus)} ·{" "}
                  {formatWhen(row.createdAt, row.currency)}
                </p>
                {row.paymentStatus === "rejected" && row.rejectReason ? (
                  <p className="mt-1 text-xs text-danger">{row.rejectReason}</p>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { applyStatusLabel } from "@/lib/format";
import { lookupApplication } from "@/lib/server/events";
import type { TicketRecord } from "@/lib/types";

export const Route = createFileRoute("/lookup")({ component: LookupPage });

function LookupPage() {
  const { user, isPending } = useCurrentUserState();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<TicketRecord[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) return <PageLoading label="打开查询" />;
  if (!user) return <RedirectToSignIn />;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const found = await lookupApplication({ data: { code: q.trim() || undefined } });
      setRows(found);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/me" className="mb-2 flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" />
        我的
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight">查询报名</h1>
      <p className="mt-1 text-sm text-muted">只能查自己的报名号。入场请让主办人扫票上的二维码。</p>
      <form onSubmit={(e) => void search(e)} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="q">报名号</Label>
          <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="HD- 或 JOM-" />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "查询中…" : "查询"}
        </Button>
      </form>
      {rows ? (
        rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted">没有找到记录</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to="/apply/$code"
                  params={{ code: row.code }}
                  className="block rounded-xl bg-surface p-3 shadow-card"
                >
                  <p className="font-medium">{row.applyNo}</p>
                  <p className="text-sm text-muted">
                    {row.event.title} · {applyStatusLabel(row.paymentStatus)}
                  </p>
                  {row.paymentStatus === "rejected" && row.rejectReason ? (
                    <p className="mt-1 text-xs text-danger">{row.rejectReason}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </main>
  );
}

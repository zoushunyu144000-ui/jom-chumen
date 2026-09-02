import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getHostEvent,
  listApplications,
  reviewApplication,
  setEventOpen,
  type ApplyRow,
} from "@/lib/server/admin";
import {
  applyStatusLabel,
  formatWhen,
  paymentLabel,
} from "@/lib/format";
import type { EventRecord, PaymentMethod } from "@/lib/types";
import { cn, waLink } from "@/lib/utils";

export const Route = createFileRoute("/manage/$eventId")({
  component: ManageEventPage,
});

const FILTERS = [
  { id: "all", name: "全部" },
  { id: "pending", name: "待确认" },
  { id: "approved", name: "已成功" },
  { id: "rejected", name: "已拒绝" },
  { id: "cancelled", name: "已取消" },
] as const;

function csvCell(value: string | number) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function ManageEventPage() {
  const { eventId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [event, setEvent] = useState<EventRecord | null | undefined>(undefined);
  const [rows, setRows] = useState<ApplyRow[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [ev, list] = await Promise.all([
      getHostEvent({ data: { eventId } }),
      listApplications({ data: { eventId, status: "all" } }),
    ]);
    setEvent(ev);
    setRows(list);
  }

  useEffect(() => {
    if (!user) return;
    reload().catch(() => {
      setEvent(null);
      setRows([]);
    });
  }, [user, eventId]);

  const shown = useMemo(
    () => (rows ?? []).filter((row) => (filter === "all" ? true : row.status === filter)),
    [rows, filter],
  );

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;
  if (event === undefined) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!event) {
    return (
      <main className="px-4 py-16 text-center">
        <p className="font-display text-lg font-semibold">找不到这场活动</p>
        <Link to="/club" className="mt-3 inline-block text-sm text-muted underline">
          返回
        </Link>
      </main>
    );
  }

  const hostEvent = event;

  async function act(id: string, action: "approve" | "reject" | "note") {
    setBusy(true);
    try {
      await reviewApplication({
        data: {
          id,
          action,
          reason: action === "reject" ? reason.trim() : "",
          note: action === "note" ? note.trim() : "",
        },
      });
      toast.success(action === "approve" ? "已同意" : action === "reject" ? "已拒绝" : "备注已记");
      setRejectId(null);
      setNoteId(null);
      setReason("");
      setNote("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function toggleOpen() {
    setBusy(true);
    try {
      await setEventOpen({ data: { eventId, open: !hostEvent.open } });
      toast.success(hostEvent.open ? "已停止新申请" : "已重新开放");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  function exportApproved() {
    const approved = (rows ?? []).filter((row) => row.status === "approved");
    const header = ["报名号", "姓名", "电话", "微信", "WhatsApp", "人数", "支付方式", "提交时间"];
    const lines = approved.map((row) =>
      [
        row.applyNo,
        row.nickname,
        row.phone,
        row.contactWechat,
        row.contactWhatsapp,
        row.seats,
        paymentLabel(row.paymentMethod as PaymentMethod),
        formatWhen(row.createdAt, hostEvent.currency),
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${hostEvent.title}-已成功.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/club" className="mb-2 flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" />
        俱乐部
      </Link>
      <h1 className="font-display text-xl font-bold tracking-tight">{event.title}</h1>
      <p className="mt-1 text-sm text-muted">
        已录 {event.booked}/{event.capacity} · {event.open ? "开放申请" : "已下架"}
      </p>
      <p className="mt-2 text-sm text-muted">点同意才算报名成功，不会自动检测付款。</p>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => void toggleOpen()} disabled={busy}>
          {event.open ? "停止报名" : "重新开放"}
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link to="/club/events/$eventId" params={{ eventId: event.id }}>
            编辑活动
          </Link>
        </Button>
      </div>
      <Button variant="ink" className="mt-2 w-full" onClick={exportApproved}>
        导出已成功
      </Button>

      <div className="mt-4 flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-3 text-sm font-medium",
              filter === item.id ? "bg-ink text-lime" : "bg-surface shadow-card",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className="mt-6 text-sm text-muted">加载中…</p>
      ) : shown.length === 0 ? (
        <p className="mt-8 text-sm text-muted">这一栏还没有申请。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((row) => (
            <li key={row.id} className="rounded-xl bg-surface p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted">{row.applyNo}</p>
                  <p className="font-medium">
                    {row.nickname} · {row.seats} 人
                  </p>
                </div>
                <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs">
                  {applyStatusLabel(row.status)}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {row.phone}
                {row.contactWechat ? ` · 微信 ${row.contactWechat}` : ""}
                {row.contactWhatsapp ? ` · WA ${row.contactWhatsapp}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {paymentLabel(row.paymentMethod as PaymentMethod)} ·{" "}
                {formatWhen(row.createdAt, event.currency)}
              </p>
              {row.adminNote ? (
                <p className="mt-1 text-xs text-muted">备注：{row.adminNote}</p>
              ) : null}
              {row.rejectReason ? (
                <p className="mt-1 text-xs text-danger">原因：{row.rejectReason}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void act(row.id, "approve")}
                    >
                      同意
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectId(row.id);
                        setNoteId(null);
                        setReason("");
                      }}
                    >
                      拒绝
                    </Button>
                  </>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNoteId(row.id);
                    setRejectId(null);
                    setNote(row.adminNote);
                  }}
                >
                  备注
                </Button>
                {row.status === "approved" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const text = [
                          row.nickname,
                          row.phone,
                          row.contactWechat && `微信 ${row.contactWechat}`,
                          row.contactWhatsapp && `WhatsApp ${row.contactWhatsapp}`,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        try {
                          await navigator.clipboard.writeText(text);
                          toast.success("已复制联系方式");
                        } catch {
                          toast.message(text);
                        }
                      }}
                    >
                      复制联系方式
                    </Button>
                    {waLink(row.contactWhatsapp) ? (
                      <Button asChild size="sm" variant="ink">
                        <a href={waLink(row.contactWhatsapp)} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {rejectId === row.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="拒绝原因（必填）"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="ink"
                    disabled={busy || !reason.trim()}
                    onClick={() => void act(row.id, "reject")}
                  >
                    确认拒绝
                  </Button>
                </div>
              ) : null}

              {noteId === row.id ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="如：截图已收"
                  />
                  <Button size="sm" disabled={busy} onClick={() => void act(row.id, "note")}>
                    记下
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

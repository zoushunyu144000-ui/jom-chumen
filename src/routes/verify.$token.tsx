import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/page-loading";
import { checkInTicket, getVerifyTicket, type VerifyResult } from "@/lib/server/verify";

export const Route = createFileRoute("/verify/$token")({ component: VerifyPage });

const STATE_LABEL: Record<VerifyResult["state"], string> = {
  valid: "有效，可以入场",
  cancelled: "已取消，不能入场",
  refunded: "已退款，不能入场",
  used: "已核销",
  pending: "还在待确认，不能入场",
  unknown: "找不到这张票",
  event_cancelled: "活动已取消，票已无效",
};

function VerifyPage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getVerifyTicket({ data: { token } })
      .then(setInfo)
      .catch(() =>
        setInfo({ valid: false, state: "unknown", eventTitle: "", nickname: "", seats: 0, applyNo: "", canCheckIn: false }),
      );
  }, [token]);

  if (!info) return <PageLoading label="验票中" />;

  async function checkIn() {
    setBusy(true);
    try {
      await checkInTicket({ data: { token } });
      toast.success("已核销");
      setInfo(await getVerifyTicket({ data: { token } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "核销失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <p className="text-xs font-medium tracking-wide text-muted">Jom 出门局 · 验票</p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
        {info.eventTitle || "无效票"}
      </h1>
      <div className={`mt-4 rounded-xl p-4 shadow-card ${info.valid ? "bg-lime" : "bg-surface"}`}>
        <p className="font-display text-lg font-semibold">{STATE_LABEL[info.state]}</p>
        {info.applyNo ? (
          <div className="mt-3 space-y-1 text-sm">
            <p>持票人 {info.nickname}</p>
            <p>{info.seats} 人</p>
            <p className="font-mono">{info.applyNo}</p>
          </div>
        ) : null}
      </div>
      {info.canCheckIn ? (
        <Button className="mt-5 w-full" disabled={busy} onClick={() => void checkIn()}>
          {busy ? "核销中…" : "一键核销"}
        </Button>
      ) : null}
      <Link to="/" className="mt-6 block text-center text-sm text-muted underline">
        回首页
      </Link>
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveImageButton } from "@/components/save-image-button";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { applyStatusLabel, formatPrice, isApplySuccess } from "@/lib/format";
import { cancelApplication } from "@/lib/server/events";
import { getLightTicket, requestRefund } from "@/lib/server/apply-view";
import { useAppStore } from "@/lib/store";
import { waLink } from "@/lib/utils";

export const Route = createFileRoute("/apply/$code")({ component: ApplyResult });

const METHOD_NAME: Record<string, string> = {
  wechat: "微信", alipay: "支付宝", tng: "TNG", cash: "现金", free: "免费",
};

function ApplyResult() {
  const { code } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const addApply = useAppStore((s) => s.addApply);
  const addTicket = useAppStore((s) => s.addTicket);
  const [apply, setApply] = useState<Awaited<ReturnType<typeof getLightTicket>> | undefined>(undefined);
  const [waQr, setWaQr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      if (!isPending) setApply(null);
      return;
    }
    getLightTicket({ data: { code } })
      .then(setApply)
      .catch(() => setApply(null));
  }, [user, isPending, code]);

  const event = apply?.event;
  const success = apply ? isApplySuccess(apply.paymentStatus) : false;
  const wa = event ? waLink(event.whatsapp) : "";

  useEffect(() => {
    if (!apply) return;
    addApply(apply.code);
    if (success) addTicket(apply.code);
  }, [apply, success, addApply, addTicket]);

  useEffect(() => {
    if (!wa) return;
    void QRCode.toDataURL(wa, { margin: 1, width: 280, color: { dark: "#141511" } }).then(setWaQr);
  }, [wa]);

  if (isPending || apply === undefined) return <PageLoading label="打开申请" />;
  if (!user) return <RedirectToSignIn />;
  if (!apply || !event) {
    return (
      <main className="px-6 py-20 text-center">
        <p className="font-display text-xl font-semibold">找不到这条申请</p>
        <Link to="/me/applies" className="mt-4 inline-block text-sm text-muted underline">我的申请</Link>
      </main>
    );
  }

  const ticket = apply;
  const method = ticket.paymentMethod;
  const payQr = method === "wechat" ? event.wechatQr : method === "alipay" ? event.alipayQr : method === "tng" ? event.tngQr : "";
  const pending = ticket.paymentStatus === "pending";

  async function cancel() {
    setBusy(true);
    try {
      await cancelApplication({ data: { code: ticket.code } });
      toast.success("已取消申请");
      setApply(await getLightTicket({ data: { code: ticket.code } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "取消失败");
    } finally {
      setBusy(false);
    }
  }

  async function refund() {
    setBusy(true);
    try {
      await requestRefund({ data: { code: ticket.code } });
      toast.success("退款申请已发给主办");
      setApply(await getLightTicket({ data: { code: ticket.code } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "申请失败");
    } finally {
      setBusy(false);
    }
  }

  const hours = event.refundHours ?? 24;
  const fee = event.refundFeePercent ?? 50;
  const start = new Date(event.startsAt).getTime();
  const remainH = (start - Date.now()) / 36e5;
  const fullRefund = remainH >= hours;

  return (
    <main className="px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/" className="flex size-11 items-center justify-center" aria-label="返回"><ArrowLeft className="size-5" /></Link>
      <p className="text-xs font-medium text-muted">{applyStatusLabel(ticket.paymentStatus)}</p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{ticket.applyNo}</h1>
      <p className="mt-1 text-sm text-muted">{event.title}</p>
      {ticket.cancelReason ? <p className="mt-2 text-sm text-danger">{ticket.cancelReason}</p> : null}

      <div className="mt-4 rounded-xl bg-surface p-4 shadow-card">
        <p className="text-sm text-muted">应付金额</p>
        <p className="font-display text-3xl font-bold">{formatPrice(ticket.amount, ticket.currency as "MYR")}</p>
        <p className="mt-1 text-sm">{METHOD_NAME[method] ?? method} · {ticket.seats} 人</p>
      </div>

      {pending && payQr && method !== "cash" && method !== "free" ? (
        <section className="mt-5 rounded-xl bg-surface p-4 text-center shadow-card">
          <p className="font-medium">请扫码付款</p>
          <img src={payQr} alt="收款码" className="mx-auto mt-3 w-48 rounded-lg" />
          <SaveImageButton src={payQr} name={`${ticket.applyNo}-pay`} />
          <p className="mt-2 text-xs text-muted">保存到相册后用{METHOD_NAME[method]}扫一扫</p>
        </section>
      ) : null}

      {pending ? (
        <section className="mt-5 rounded-xl bg-lime p-4 text-center">
          <p className="font-medium">加客服 WhatsApp</p>
          {waQr ? <img src={waQr} alt="WhatsApp" className="mx-auto mt-3 w-44 rounded-lg bg-surface p-2" /> : null}
          {wa ? <Button asChild className="mt-3 w-full" variant="ink"><a href={wa} target="_blank" rel="noreferrer">打开 WhatsApp</a></Button> : null}
        </section>
      ) : null}

      {success ? (
        <section className="mt-5 rounded-xl bg-lime p-4">
          <p className="font-display text-lg font-bold">申请退款</p>
          <p className="mt-2 text-sm leading-relaxed">
            规则：活动开始前 {hours} 小时申请，全额退。
            不够 {hours} 小时则扣 {fee}%。
            现在{fullRefund ? `还有超过 ${Math.floor(remainH)} 小时，可申请全额退。` : `已不够 ${hours} 小时，申请后将扣 ${fee}%。`}
          </p>
          {ticket.refundStatus === "requested" ? (
            <p className="mt-3 text-sm font-medium">退款申请已提交，等主办处理。</p>
          ) : (
            <Button className="mt-3 w-full" variant="ink" disabled={busy} onClick={() => void refund()}>申请退款</Button>
          )}
        </section>
      ) : null}

      {success ? (
        <Button asChild className="mt-5 w-full"><Link to="/ticket/$code" params={{ code: ticket.code }}>查看门票</Link></Button>
      ) : null}

      {pending ? (
        <button type="button" className="mt-6 block w-full text-center text-sm text-muted" disabled={busy} onClick={() => void cancel()}>
          {busy ? "取消中…" : "取消申请"}
        </button>
      ) : null}
    </main>
  );
}

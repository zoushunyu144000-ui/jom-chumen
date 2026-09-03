import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveImageButton } from "@/components/save-image-button";
import { formatPrice } from "@/lib/format";
import { createRegistration } from "@/lib/server/events";
import { getPublicEvent } from "@/lib/server/event-public";
import { useAppStore } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";
import { cn, digitsOnly } from "@/lib/utils";

export const Route = createFileRoute("/events/$slug/register")({
  loader: async ({ params }) => {
    const event = await getPublicEvent({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return { event };
  },
  component: RegisterPage,
});

const METHODS: { id: PaymentMethod; name: string }[] = [
  { id: "wechat", name: "微信" },
  { id: "alipay", name: "支付宝" },
  { id: "tng", name: "TNG" },
  { id: "cash", name: "现金" },
];

function RegisterPage() {
  const { event } = Route.useLoaderData();
  const navigate = useNavigate();
  const addApply = useAppStore((s) => s.addApply);
  const [nickname, setNickname] = useState("");
  const [wechat, setWechat] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [seats, setSeats] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("tng");
  const [submitting, setSubmitting] = useState(false);
  const total = event.price * seats;
  const full = event.remaining <= 0;
  const closed = !event.open;
  const payQr =
    method === "wechat" ? event.wechatQr : method === "alipay" ? event.alipayQr : method === "tng" ? event.tngQr : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const wa = digitsOnly(whatsapp);
    if (!nickname.trim() || wa.length < 8) {
      toast.error("请填写姓名和 WhatsApp");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createRegistration({
        data: {
          slug: event.slug,
          nickname: nickname.trim(),
          seats,
          paymentMethod: total <= 0 ? "free" : method,
          contactWechat: wechat.trim(),
          contactWhatsapp: wa,
        },
      });
      addApply(created.code);
      await navigate({ to: "/apply/$code", params: { code: created.code } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pb-10">
      <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/events/$slug" params={{ slug: event.slug }} className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">提交报名申请</h1>
      </header>

      <form onSubmit={(e) => void submit(e)} className="space-y-4 px-4">
        <p className="rounded-lg bg-lime/40 px-3 py-2 text-sm">提交不等于报名成功。请先付款并加客服，等管理员点同意。</p>
        {closed ? <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">这场已停止报名。</p> : null}
        {full && !closed ? <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">名额已满，仍可提交。</p> : null}

        <div className="space-y-1.5">
          <Label htmlFor="name">姓名</Label>
          <Input id="name" value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={24} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wa">WhatsApp</Label>
          <Input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(digitsOnly(e.target.value).slice(0, 20))} inputMode="numeric" required placeholder="含区号，如 601135550088" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wechat">微信号（选填）</Label>
          <Input id="wechat" value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder="沠有可以不填" />
        </div>

        <div>
          <Label>人数</Label>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card" onClick={() => setSeats((n) => Math.max(1, n - 1))}>
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-display text-xl">{seats}</span>
            <button type="button" className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card" onClick={() => setSeats((n) => Math.min(4, n + 1))}>
              <Plus className="size-4" />
            </button>
            <span className="text-sm text-muted">{formatPrice(total, event.currency)}</span>
          </div>
        </div>

        {total > 0 ? (
          <div>
            <Label>支付方式</Label>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {METHODS.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setMethod(item.id)} className={cn("flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium shadow-card", method === item.id ? "bg-lime" : "bg-surface")}>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
            {payQr && method !== "cash" ? (
              <div className="mt-3 rounded-xl bg-surface p-4 text-center shadow-card">
                <p className="font-medium">请扫码付款</p>
                <img src={payQr} alt="收款码" className="mx-auto mt-3 w-48 rounded-lg bg-paper" />
                <SaveImageButton src={payQr} name={`${event.slug}-${method}`} />
                <p className="mt-2 text-xs text-muted">保存后打开相册，用微信/支付宝/TNG 扫一扫</p>
              </div>
            ) : method === "cash" ? (
              <p className="mt-2 text-sm text-muted">现金按客服指引给。</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">这场免费，仍需管理员确认。</p>
        )}

        <div className="rounded-xl bg-ink px-3 py-3 text-sm text-lime">
          退款规则：活动开始前 {event.refundHours ?? 24} 小时申请，可全额退。
          过了这个时间申请，扣 {(event.refundFeePercent ?? 50)}%。
          提交后在报名页点「申请退款」。
        </div>

        <Button type="submit" className="w-full" disabled={submitting || closed}>
          {closed ? "已停止报名" : submitting ? "提交中…" : "提交申请"}
        </Button>
      </form>
    </main>
  );
}

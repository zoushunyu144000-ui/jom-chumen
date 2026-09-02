import { useState } from "react";
import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { createRegistration, getEventBySlug } from "@/lib/server/events";
import { useAppStore } from "@/lib/store";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events/$slug/register")({
  loader: async ({ params }) => {
    const event = await getEventBySlug({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return { event };
  },
  component: RegisterPage,
});

const METHODS: { id: PaymentMethod; name: string; hint: string }[] = [
  { id: "wechat", name: "微信", hint: "转账后把截图发给客服" },
  { id: "alipay", name: "支付宝", hint: "转账后把截图发给客服" },
  { id: "tng", name: "TNG", hint: "Touch 'n Go eWallet" },
  { id: "cash", name: "现金", hint: "现场或按客服指引" },
];

function RegisterPage() {
  const { event } = Route.useLoaderData();
  const navigate = useNavigate();
  const addApply = useAppStore((s) => s.addApply);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [wechat, setWechat] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [seats, setSeats] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("tng");
  const [submitting, setSubmitting] = useState(false);
  const total = event.price * seats;
  const full = event.remaining <= 0;
  const closed = !event.open;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || phone.replace(/\D/g, "").length < 8) {
      toast.error("请填写姓名和手机号");
      return;
    }
    if (!wechat.trim() && !whatsapp.trim()) {
      toast.error("微信号或 WhatsApp 至少填一个");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createRegistration({
        data: {
          slug: event.slug,
          nickname: nickname.trim(),
          phone: phone.trim(),
          seats,
          paymentMethod: total <= 0 ? "free" : method,
          contactWechat: wechat.trim(),
          contactWhatsapp: whatsapp.trim(),
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
        <Link
          to="/events/$slug"
          params={{ slug: event.slug }}
          className="flex size-11 items-center justify-center"
          aria-label="返回"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">提交报名申请</h1>
      </header>

      <form onSubmit={(e) => void submit(e)} className="space-y-4 px-4">
        <p className="rounded-lg bg-lime/40 px-3 py-2 text-sm">
          提交不等于报名成功。请先付款并加客服，等管理员点同意。
        </p>
        {closed ? (
          <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">
            这场已停止报名。
          </p>
        ) : null}
        {full && !closed ? (
          <p className="rounded-lg bg-surface px-3 py-2 text-sm text-muted">
            名额已满，仍可提交，是否录取由发起人决定。
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="name">姓名</Label>
          <Input
            id="name"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            maxLength={24}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">手机号</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            required
            placeholder="用于查询报名"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wechat">微信号</Label>
          <Input
            id="wechat"
            value={wechat}
            onChange={(e) => setWechat(e.target.value)}
            placeholder="和 WhatsApp 至少填一个"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wa">WhatsApp</Label>
          <Input
            id="wa"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            placeholder="含区号更好，如 6011..."
          />
        </div>

        <div>
          <Label>人数</Label>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card"
              onClick={() => setSeats((n) => Math.max(1, n - 1))}
            >
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-display text-xl">{seats}</span>
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card"
              onClick={() => setSeats((n) => Math.min(4, n + 1))}
            >
              <Plus className="size-4" />
            </button>
            <span className="text-sm text-muted">
              {formatPrice(total, event.currency)}
            </span>
          </div>
        </div>

        {total > 0 ? (
          <div>
            <Label>支付方式</Label>
            <ul className="mt-2 space-y-2">
              {METHODS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setMethod(item.id)}
                    className={cn(
                      "flex h-14 w-full items-center justify-between rounded-lg px-3 text-left text-sm shadow-card",
                      method === item.id ? "bg-lime" : "bg-surface",
                    )}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted">{item.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted">这场免费，仍需管理员确认。</p>
        )}

        <Button type="submit" className="w-full" disabled={submitting || closed}>
          {closed ? "已停止报名" : submitting ? "提交中…" : "提交申请"}
        </Button>
      </form>
    </main>
  );
}

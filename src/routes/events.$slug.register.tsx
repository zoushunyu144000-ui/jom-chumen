import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatPrice } from "@/lib/format";
import { createLightRegistration } from "@/lib/server/register";
import { getPublicEvent } from "@/lib/server/event-public";
import { useAppStore } from "@/lib/store";
import { cn, digitsOnly } from "@/lib/utils";

export const Route = createFileRoute("/events/$slug/register")({
  loader: async ({ params }) => {
    const event = await getPublicEvent({ data: { slug: params.slug } });
    if (!event) throw notFound();
    return { event };
  },
  component: RegisterPage,
});

function RegisterPage() {
  const { event } = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const addApply = useAppStore((s) => s.addApply);
  const [nickname, setNickname] = useState(user?.displayName || "");
  const [wechat, setWechat] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [seats, setSeats] = useState(1);
  const [method, setMethod] = useState<"tng" | "cash">("tng");
  const [submitting, setSubmitting] = useState(false);
  const total = event.price * seats;
  const closed = !event.open;

  useEffect(() => {
    if (user?.displayName && !nickname.trim()) setNickname(user.displayName);
  }, [user?.displayName, nickname]);

  if (isPending) return <PageLoading label="确认登录" />;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const wa = digitsOnly(whatsapp);
    if (!nickname.trim() || wa.length < 8) {
      toast.error("请填写姓名和 WhatsApp");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createLightRegistration({
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
      setSubmitting(false);
    }
  }

  return (
    <main className="pb-10">
      {submitting ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper/90">
          <PageLoading label="正在提交报名" />
        </div>
      ) : null}
      <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/events/$slug" params={{ slug: event.slug }} className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">提交报名申请</h1>
      </header>
      <form onSubmit={(e) => void submit(e)} className="space-y-4 px-4">
        <p className="rounded-lg bg-lime/40 px-3 py-2 text-sm">先选支付方式再提交。提交后才会出现收款码和客服 WhatsApp。</p>
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
          <Input id="wechat" value={wechat} onChange={(e) => setWechat(e.target.value)} />
        </div>
        <div>
          <Label>人数</Label>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card" onClick={() => setSeats((n) => Math.max(1, n - 1))}><Minus className="size-4" /></button>
            <span className="w-8 text-center font-display text-xl">{seats}</span>
            <button type="button" className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card" onClick={() => setSeats((n) => Math.min(4, n + 1))}><Plus className="size-4" /></button>
            <span className="text-sm text-muted">{formatPrice(total, event.currency)}</span>
          </div>
        </div>
        {total > 0 ? (
          <div>
            <Label>支付方式</Label>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              <li><button type="button" onClick={() => setMethod("tng")} className={cn("flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium shadow-card", method === "tng" ? "bg-lime" : "bg-surface")}>TNG</button></li>
              <li><button type="button" onClick={() => setMethod("cash")} className={cn("flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium shadow-card", method === "cash" ? "bg-lime" : "bg-surface")}>现金</button></li>
            </ul>
          </div>
        ) : <p className="text-sm text-muted">这场免费，仍需管理员确认。</p>}
        <Button type="submit" className="w-full" disabled={submitting || closed}>{closed ? "已停止报名" : submitting ? "提交中…" : "确认报名"}</Button>
      </form>
    </main>
  );
}

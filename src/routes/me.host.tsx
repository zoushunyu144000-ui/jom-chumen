import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CoverPicker } from "@/components/cover-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isRealQr, isRealWhatsapp } from "@/lib/pay";
import { getHostSettings, saveHostSettings } from "@/lib/server/profile";
import { digitsOnly, waLink } from "@/lib/utils";

export const Route = createFileRoute("/me/host")({ component: HostSettingsPage });

function HostSettingsPage() {
  const { user, isPending } = useCurrentUserState();
  const [whatsapp, setWhatsapp] = useState("");
  const [wechatQr, setWechatQr] = useState("");
  const [alipayQr, setAlipayQr] = useState("");
  const [tngQr, setTngQr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getHostSettings()
      .then((s) => {
        setWhatsapp(s.whatsapp);
        setWechatQr(s.wechat_qr);
        setAlipayQr(s.alipay_qr);
        setTngQr(s.tng_qr);
      })
      .catch(() => undefined);
  }, [user?.id]);

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;

  async function saveQr(field: "wechatQr" | "alipayQr" | "tngQr", src: string, label: string) {
    if (field === "wechatQr") setWechatQr(src);
    if (field === "alipayQr") setAlipayQr(src);
    if (field === "tngQr") setTngQr(src);
    try {
      await saveHostSettings({ data: { [field]: src } });
      toast.success(`${label}已保存`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isRealWhatsapp(whatsapp)) {
      toast.error("客服 WhatsApp 必填，含国家区号");
      return;
    }
    if (!isRealQr(tngQr)) {
      toast.error("TNG 收款码必须上传");
      return;
    }
    setBusy(true);
    try {
      await saveHostSettings({ data: { whatsapp: digitsOnly(whatsapp) } });
      toast.success("已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  const wa = waLink(digitsOnly(whatsapp));

  return (
    <main className="pb-10">
      <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/me" className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">收款与客服</h1>
      </header>
      <form onSubmit={(e) => void submit(e)} className="space-y-5 px-4">
        <p className="rounded-lg bg-lime/40 px-3 py-2 text-sm">
          报名只接受 TNG 或现金。TNG 收款码和 WhatsApp 必填。微信/支付宝可选。
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="wa">客服 WhatsApp（必填）</Label>
          <Input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(digitsOnly(e.target.value).slice(0, 20))} inputMode="numeric" placeholder="如 601135550088" />
          <p className="text-xs text-muted">马来西亚写 60 开头，中国写 86。点检测会打开 WhatsApp，看是不是你自己的号。</p>
          {wa ? (
            <Button asChild type="button" variant="outline" className="w-full">
              <a href={wa} target="_blank" rel="noreferrer">检测这个号码</a>
            </Button>
          ) : null}
        </div>
        <CoverPicker value={tngQr} onChange={(src) => void saveQr("tngQr", src, "TNG 收款码")} label="TNG 收款码（必填）" variant="qr" hint="相册截图，选完立刻保存" />
        <CoverPicker value={wechatQr} onChange={(src) => void saveQr("wechatQr", src, "微信收款码")} label="微信收款码（可选）" variant="qr" hint="报名页不再出微信支付" />
        <CoverPicker value={alipayQr} onChange={(src) => void saveQr("alipayQr", src, "支付宝收款码")} label="支付宝收款码（可选）" variant="qr" hint="报名页不再出支付宝支付" />
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "保存中…" : "保存"}</Button>
      </form>
    </main>
  );
}

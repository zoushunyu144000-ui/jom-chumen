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
import { getHostSettings, saveHostSettings } from "@/lib/server/profile";
import { digitsOnly } from "@/lib/utils";

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

  async function saveQr(
    field: "wechatQr" | "alipayQr" | "tngQr",
    src: string,
    label: string,
  ) {
    if (field === "wechatQr") setWechatQr(src);
    if (field === "alipayQr") setAlipayQr(src);
    if (field === "tngQr") setTngQr(src);
    try {
      await saveHostSettings({ data: { [field]: src } });
      toast.success(`${label}已保存`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "收款码保存失败，请截一张更小的图再试");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveHostSettings({
        data: { whatsapp: digitsOnly(whatsapp) },
      });
      toast.success("客服号码已保存，之后发布的活动会带上");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

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
          报名不会自动扣款。用户扫你的个人收款码，再把截图发到 WhatsApp。
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="wa">客服 WhatsApp / 手机号</Label>
          <Input
            id="wa"
            value={whatsapp}
            onChange={(e) => setWhatsapp(digitsOnly(e.target.value).slice(0, 20))}
            inputMode="numeric"
            placeholder="含区号，如 601135550088"
          />
          <p className="text-xs text-muted">只填数字。马来西亚先写 60，不要写 + 和空格。</p>
        </div>
        <div className="space-y-3">
          <CoverPicker
            value={wechatQr}
            onChange={(src) => void saveQr("wechatQr", src, "微信收款码")}
            label="微信收款码"
            variant="qr"
            hint="选相册里的收款码截图，选完会立刻保存"
          />
          <CoverPicker
            value={alipayQr}
            onChange={(src) => void saveQr("alipayQr", src, "支付宝收款码")}
            label="支付宝收款码"
            variant="qr"
            hint="选相册里的收款码截图，选完会立刻保存"
          />
          <CoverPicker
            value={tngQr}
            onChange={(src) => void saveQr("tngQr", src, "TNG 收款码")}
            label="TNG 收款码"
            variant="qr"
            hint="选相册里的收款码截图，选完会立刻保存"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "保存中…" : "保存客服号码"}
        </Button>
      </form>
    </main>
  );
}

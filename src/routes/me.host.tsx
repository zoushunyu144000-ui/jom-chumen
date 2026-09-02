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

export const Route = createFileRoute("/me/host")({ component: HostSettingsPage });

function HostSettingsPage() {
  const { user, isPending } = useCurrentUserState();
  const [whatsapp, setWhatsapp] = useState("");
  const [wechatQr, setWechatQr] = useState("");
  const [alipayQr, setAlipayQr] = useState("");
  const [tngQr, setTngQr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getHostSettings()
      .then((s) => {
        setWhatsapp(s.whatsapp);
        setWechatQr(s.wechat_qr);
        setAlipayQr(s.alipay_qr);
        setTngQr(s.tng_qr);
      })
      .catch(() => undefined);
  }, [user]);

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveHostSettings({
        data: { whatsapp, wechatQr, alipayQr, tngQr },
      });
      toast.success("已保存，之后发布的活动会带上");
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
          <Label htmlFor="wa">客服 WhatsApp</Label>
          <Input
            id="wa"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            placeholder="含区号，如 6011..."
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>微信收款码</Label>
            <div className="mt-2">
              <CoverPicker value={wechatQr} onChange={setWechatQr} label="微信" variant="qr" />
            </div>
          </div>
          <div>
            <Label>支付宝</Label>
            <div className="mt-2">
              <CoverPicker value={alipayQr} onChange={setAlipayQr} label="支付宝" variant="qr" />
            </div>
          </div>
          <div>
            <Label>TNG</Label>
            <div className="mt-2">
              <CoverPicker value={tngQr} onChange={setTngQr} label="TNG" variant="qr" />
            </div>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "保存中…" : "保存默认设置"}
        </Button>
      </form>
    </main>
  );
}

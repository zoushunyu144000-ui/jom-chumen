import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveProfile } from "@/lib/server/profile";

export const Route = createFileRoute("/login")({ component: Login });

const googleReady = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

function Login() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("in");

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "up" && !gender) {
      setError("请选择性别");
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Jom",
        });
        if (result.error) throw new Error(result.error.message || "注册失败");
        try {
          await saveProfile({
            data: {
              displayName: name.trim() || email.split("@")[0] || "Jom",
              avatarUrl: "",
              tags: [],
              gender,
            },
          });
        } catch {
          /* profile can be completed later */
        }
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message || "登录失败");
      }
      await navigate({ to: "/me" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError("");
    setBusy(true);
    try {
      const { data, error: authError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/me/profile",
      });
      if (authError) throw new Error(authError.message || "谷歌登录失败");
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "谷歌登录失败，先用邮箱");
      setBusy(false);
    }
  }

  return (
    <main className="px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">Jom</Link>
      <h1 className="mt-8 font-display text-3xl font-bold tracking-tight">{mode === "in" ? "登录" : "创建账号"}</h1>
      {authEnabled ? (
        <>
          <Tabs value={mode} onValueChange={setMode} className="mt-8">
            <TabsList className="w-full">
              <TabsTrigger value="in">登录</TabsTrigger>
              <TabsTrigger value="up">注册</TabsTrigger>
            </TabsList>
            <TabsContent value={mode}>
              <form onSubmit={(e) => void onEmail(e)} className="space-y-3">
                {mode === "up" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">称呼</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="写在俱乐部和票上" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>性别</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ id: "female", name: "女" }, { id: "male", name: "男" }, { id: "other", name: "不展示" }].map((item) => (
                          <button key={item.id} type="button" onClick={() => setGender(item.id)} className={`h-11 rounded-lg text-sm shadow-card ${gender === item.id ? "bg-lime" : "bg-surface"}`}>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">密码</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "up" ? "new-password" : "current-password"} placeholder="至少 8 位" />
                </div>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "请稍候…" : mode === "in" ? "登录" : "注册并进入"}</Button>
              </form>
            </TabsContent>
          </Tabs>
          {googleReady ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs text-muted">或</span><Separator className="flex-1" /></div>
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void onGoogle()}>使用 Google 继续</Button>
              <p className="text-center text-xs text-muted">谷歌登录后请在资料里补性别</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-8 text-sm text-muted">登录暂未开启。</p>
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { CoverPicker } from "@/components/cover-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getProfile, saveProfile } from "@/lib/server/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/me/profile")({ component: ProfilePage });

const SUGGESTED = [
  "飞盘",
  "摄影",
  "徒步",
  "读书",
  "深度聊天",
  "瑜伽",
  "露营",
  "citywalk",
];

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getProfile()
      .then((p) => {
        setName(p.displayName || "");
        setAvatar(p.avatarUrl);
        setTags(p.tags);
      })
      .catch(() => undefined);
  }, [user?.id]);

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;

  function addTag(raw?: string) {
    const t = (raw ?? draft).trim().replace(/^#/, "");
    if (!t || tags.includes(t) || tags.length >= 8) return;
    setTags([...tags, t]);
    setDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveProfile({
        data: { displayName: name.trim(), avatarUrl: avatar, tags },
      });
      toast.success("已保存");
      await navigate({ to: "/me" });
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
        <h1 className="font-display text-lg font-semibold">编辑资料</h1>
      </header>
      <form onSubmit={(e) => void submit(e)} className="space-y-6 px-4">
        <CoverPicker
          value={avatar}
          onChange={setAvatar}
          label="上传头像"
          variant="avatar"
        />
        <div className="space-y-1.5">
          <Label htmlFor="dn">名字</Label>
          <Input
            id="dn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            required
            placeholder="别人看到的名字"
          />
        </div>
        <div>
          <Label>个性标签</Label>
          <p className="mt-1 text-xs text-muted">最多 8 个，点已选标签可删</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="flex h-8 items-center gap-1 rounded-full bg-lime px-3 text-xs font-medium"
              >
                {tag}
                <X className="size-3" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="自己写一个"
              maxLength={12}
            />
            <Button type="button" variant="outline" onClick={() => addTag()}>
              添加
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => (on ? setTags(tags.filter((t) => t !== tag)) : addTag(tag))}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-medium shadow-card",
                    on ? "bg-ink text-lime" : "bg-surface text-ink-soft",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "保存中…" : "保存资料"}
        </Button>
      </form>
    </main>
  );
}

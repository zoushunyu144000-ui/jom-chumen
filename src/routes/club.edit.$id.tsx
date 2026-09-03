import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CoverPicker } from "@/components/cover-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { EVENT_CITIES } from "@/lib/catalog";
import { clubInviteInfo } from "@/lib/server/chat";
import { getMyClub, updateClub } from "@/lib/server/clubs";
import type { CityId } from "@/lib/types";

export const Route = createFileRoute("/club/edit/$id")({ component: EditClubPage });

function EditClubPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState<Exclude<CityId, "all">>("penang");
  const [coverUrl, setCoverUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState("");

  useEffect(() => {
    if (!user) return;
    getMyClub({ data: { id } })
      .then((club) => {
        if (!club) {
          toast.error("找不到这个俱乐部");
          return;
        }
        setName(club.name);
        setBio(club.bio);
        setCity(club.city);
        setCoverUrl(club.coverUrl);
        setReady(true);
      })
      .catch(() => toast.error("加载失败"));
    clubInviteInfo({ data: { clubId: id } })
      .then((info) => {
        const origin = window.location.origin;
        setInvite(`${origin}/club/join/${info.code}`);
      })
      .catch(() => undefined);
  }, [user?.id, id]);

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("给俱乐部起个名字");
      return;
    }
    setBusy(true);
    try {
      await updateClub({ data: { id, name: name.trim(), bio: bio.trim(), city, coverUrl } });
      toast.success("已保存");
      await navigate({ to: "/club" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pb-10">
      <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/club" className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">编辑俱乐部</h1>
      </header>
      {ready ? (
        <form onSubmit={(e) => void submit(e)} className="space-y-4 px-4">
          <CoverPicker value={coverUrl} onChange={setCoverUrl} label="俱乐部封面" />
          <div className="space-y-1.5">
            <Label htmlFor="club-name">名称</Label>
            <Input id="club-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club-bio">简介</Label>
            <Textarea id="club-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club-city">主场城市</Label>
            <NativeSelect id="club-city" value={city} onChange={(e) => setCity(e.target.value as Exclude<CityId, "all">)}>
              {EVENT_CITIES.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </NativeSelect>
          </div>
          {invite ? (
            <div className="rounded-xl bg-surface p-3 shadow-card">
              <p className="text-sm font-medium">邀请管理员</p>
              <p className="mt-1 text-xs text-muted">把链接发给信任的人，他登录后可以审核报名。</p>
              <p className="mt-2 break-all text-xs">{invite}</p>
              <Button type="button" variant="outline" className="mt-2 w-full" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite);
                  toast.success("邀请链接已复制");
                } catch {
                  toast.message(invite);
                }
              }}>复制邀请链接</Button>
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "保存中…" : "保存"}</Button>
        </form>
      ) : (
        <p className="px-4 py-8 text-sm text-muted">加载中…</p>
      )}
    </main>
  );
}

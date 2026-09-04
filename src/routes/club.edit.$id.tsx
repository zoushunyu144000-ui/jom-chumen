import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CoverPicker } from "@/components/cover-picker";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { EVENT_CITIES } from "@/lib/catalog";
import { clubInviteInfo } from "@/lib/server/chat";
import { getMyClub, removeClubAdmin, transferClubOwner, updateClub } from "@/lib/server/clubs";
import type { CityId, ClubStaff } from "@/lib/types";

export const Route = createFileRoute("/club/edit/$id")({ component: EditClubPage });

function EditClubPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState<Exclude<CityId, "all">>("penang");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [staff, setStaff] = useState<ClubStaff[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState("");

  async function reload() {
    const club = await getMyClub({ data: { id } });
    if (!club) {
      toast.error("找不到这个俱乐部");
      return;
    }
    setName(club.name);
    setBio(club.bio);
    setCity(club.city);
    setCoverUrl(club.coverUrl);
    setAvatarUrl(club.avatarUrl);
    setStaff(club.staff);
    setIsOwner(club.isOwner);
    setReady(true);
  }

  useEffect(() => {
    if (!user) return;
    reload().catch(() => toast.error("加载失败"));
    clubInviteInfo({ data: { clubId: id } })
      .then((info) => {
        const origin = window.location.origin;
        setInvite(`${origin}/club/join/${info.code}`);
      })
      .catch(() => undefined);
  }, [user?.id, id]);

  if (isPending) return <PageLoading label="打开俱乐部" />;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("给俱乐部起个名字");
      return;
    }
    setBusy(true);
    try {
      await updateClub({ data: { id, name: name.trim(), bio: bio.trim(), city, coverUrl, avatarUrl } });
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
          <CoverPicker value={avatarUrl} onChange={setAvatarUrl} label="头像" variant="avatar" />
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
          {staff.length ? (
            <div className="rounded-xl bg-surface p-3 shadow-card">
              <p className="text-sm font-medium">主人 / 主理人</p>
              <ul className="mt-2 space-y-2">
                {staff.map((person) => (
                  <li key={person.userId} className="flex items-center gap-2">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-8 items-center justify-center rounded-full bg-lime text-xs font-semibold">{person.name.slice(0, 1)}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{person.name}</p>
                      <p className="text-xs text-muted">{person.role === "owner" ? "主人" : "主理人"}</p>
                    </span>
                    {isOwner && person.role !== "owner" ? (
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={async () => {
                          setBusy(true);
                          try {
                            await transferClubOwner({ data: { clubId: id, userId: person.userId } });
                            toast.success("已转让主人");
                            await reload();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "转让失败");
                          } finally {
                            setBusy(false);
                          }
                        }}>转让</Button>
                        <Button type="button" size="sm" variant="outline" onClick={async () => {
                          setBusy(true);
                          try {
                            await removeClubAdmin({ data: { clubId: id, userId: person.userId } });
                            toast.success("已移除");
                            await reload();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "移除失败");
                          } finally {
                            setBusy(false);
                          }
                        }}>移除</Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {invite ? (
            <div className="rounded-xl bg-surface p-3 shadow-card">
              <p className="text-sm font-medium">邀请主理人</p>
              <p className="mt-1 text-xs text-muted">把链接发给信任的人，登录后可以一起管俱乐部和活动。</p>
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
        <PageLoading label="读取资料" />
      )}
    </main>
  );
}

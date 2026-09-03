import { useState } from "react";
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
import { createClub } from "@/lib/server/clubs";
import type { CityId } from "@/lib/types";

export const Route = createFileRoute("/me/club")({ component: NewClubPage });

function NewClubPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState<Exclude<CityId, "all">>("penang");
  const [coverUrl, setCoverUrl] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return <PageLoading label="创建俱乐部" />;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("给俱乐部起个名字");
      return;
    }
    setBusy(true);
    try {
      const created = await createClub({
        data: { name: name.trim(), bio: bio.trim(), city, coverUrl },
      });
      toast.success("俱乐部已创建");
      await navigate({ to: "/club" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pb-10">
      <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          to="/club"
          className="flex size-11 items-center justify-center"
          aria-label="返回"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">创建俱乐部</h1>
      </header>
      <form onSubmit={(e) => void submit(e)} className="space-y-4 px-4">
        <CoverPicker value={coverUrl} onChange={setCoverUrl} label="俱乐部封面" />
        <div className="space-y-1.5">
          <Label htmlFor="club-name">名称</Label>
          <Input
            id="club-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="比如 槟城飞盘社"
            maxLength={24}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="club-bio">简介</Label>
          <Textarea
            id="club-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="你们通常玩什么、在哪一带"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="club-city">主场城市</Label>
          <NativeSelect
            id="club-city"
            value={city}
            onChange={(e) => setCity(e.target.value as Exclude<CityId, "all">)}
          >
            {EVENT_CITIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "创建中…" : "创建"}
        </Button>
      </form>
    </main>
  );
}

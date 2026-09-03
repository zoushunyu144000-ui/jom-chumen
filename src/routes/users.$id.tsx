import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/page-loading";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatWhen } from "@/lib/format";
import { getPublicPerson, openUserChat } from "@/lib/server/people";

export const Route = createFileRoute("/users/$id")({ component: PersonPage });

const GENDER: Record<string, string> = { female: "女", male: "男", other: "其他" };

function PersonPage() {
  const { id } = Route.useParams();
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Awaited<ReturnType<typeof getPublicPerson>>>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPublicPerson({ data: { userId: id } }).then(setPerson).catch(() => setPerson(null));
  }, [id]);

  if (!person) return <PageLoading label="打开主页" />;

  async function message() {
    if (!user) {
      await navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const chat = await openUserChat({ data: { userId: id } });
      await navigate({ to: "/chat/$id", params: { id: chat.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "私信打不开");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/" className="flex size-11 items-center justify-center" aria-label="返回">
        <ArrowLeft className="size-5" />
      </Link>
      <div className="mt-2 flex items-center gap-3">
        {person.avatarUrl ? (
          <img src={person.avatarUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-lime font-display text-xl font-bold">
            {person.name.slice(0, 1)}
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold">{person.name}</h1>
          <p className="text-sm text-muted">{GENDER[person.gender] || "性别未填"}</p>
        </div>
      </div>
      {person.tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {person.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-surface px-3 py-1 text-xs">{tag}</span>
          ))}
        </div>
      ) : null}
      {user?.id !== id ? (
        <Button className="mt-5 w-full" disabled={busy} onClick={() => void message()}>
          {busy ? "打开中…" : "发私信"}
        </Button>
      ) : null}
      <h2 className="mt-8 font-display text-lg font-semibold">参加过的活动</h2>
      {person.events.length === 0 ? (
        <p className="mt-3 text-sm text-muted">还沠有公开的报名记录。</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {person.events.map((event) => (
            <li key={event.slug}>
              <Link to="/events/$slug" params={{ slug: event.slug }} className="block rounded-xl bg-surface px-3 py-3 shadow-card">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted">{formatWhen(event.startsAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

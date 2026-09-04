import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listHostEvents } from "@/lib/server/admin";
import { formatWhen } from "@/lib/format";
import type { EventRecord } from "@/lib/types";
import { PageLoading } from "@/components/page-loading";

export const Route = createFileRoute("/manage/")({ component: ManagePage });

function ManagePage() {
  const { user, isPending } = useCurrentUserState();
  const [events, setEvents] = useState<EventRecord[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listHostEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [user]);

  if (isPending) return <PageLoading label="加载中" />;
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/club" className="mb-2 flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" />
        俱乐部
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight">审核后台</h1>
      <p className="mt-1 text-sm text-muted">只处理你发起的活动。同意后才算报名成功。</p>
      {events === null ? (
        <PageLoading label="加载活动" compact />
      ) : events.length === 0 ? (
        <p className="mt-8 text-sm text-muted">还没有你发起的局。底部「发布」可以发一场。</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                to="/manage/$eventId"
                params={{ eventId: event.id }}
                className="flex gap-3 rounded-xl bg-surface p-2 shadow-card"
              >
                <img src={event.coverUrl} alt="" className="size-14 rounded-md object-cover" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{event.title}</span>
                  <span className="text-xs text-muted">
                    {formatWhen(event.startsAt, event.currency)} · 已录 {event.booked}/{event.capacity}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

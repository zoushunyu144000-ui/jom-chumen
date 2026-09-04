import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/page-loading";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cancelEvent, deleteDraftEvent, listHostInbox, type InboxRow } from "@/lib/server/admin";
import { listHostEventCards, listMyClubCards, type HostEventCard } from "@/lib/server/host-lists";
import { cityName } from "@/lib/catalog";
import { formatWhen } from "@/lib/format";

export const Route = createFileRoute("/club/")({ component: ClubStudioPage });

function ClubStudioPage() {
  const { user, isPending } = useCurrentUserState();
  const [clubs, setClubs] = useState<{ id: string; name: string; city: string; eventCount: number }[] | null>(null);
  const [events, setEvents] = useState<HostEventCard[] | null>(null);
  const [inbox, setInbox] = useState<InboxRow[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    listHostInbox().then(setInbox).catch(() => setInbox([]));
    listHostEventCards().then(setEvents).catch(() => setEvents([]));
    listMyClubCards().then(setClubs).catch(() => setClubs([]));
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listHostInbox().then((rows) => { if (!cancelled) setInbox(rows); }).catch(() => { if (!cancelled) setInbox([]); });
    listHostEventCards().then((rows) => { if (!cancelled) setEvents(rows); }).catch(() => { if (!cancelled) setEvents([]); });
    listMyClubCards().then((rows) => { if (!cancelled) setClubs(rows); }).catch(() => { if (!cancelled) setClubs([]); });
    return () => { cancelled = true; };
  }, [user]);

  const pendingByEvent = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of inbox ?? []) map.set(row.eventId, (map.get(row.eventId) ?? 0) + 1);
    return map;
  }, [inbox]);

  async function onDelete(event: HostEventCard) {
    if (event.applyCount > 0 || event.booked > 0) {
      setConfirmId(null);
      setCancelId(event.id);
      setCancelReason("");
      return;
    }
    setBusyId(event.id);
    try {
      await deleteDraftEvent({ data: { eventId: event.id } });
      toast.success("活动已删除");
      setConfirmId(null);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      if (message.includes("不能删除")) {
        setConfirmId(null);
        setCancelId(event.id);
        setCancelReason("");
        toast.error("已有报名，改为取消活动");
      } else {
        toast.error(message);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onCancel(event: HostEventCard) {
    if (cancelReason.trim().length < 2) {
      toast.error("请填写取消原因");
      return;
    }
    setBusyId(event.id);
    try {
      await cancelEvent({ data: { eventId: event.id, reason: cancelReason.trim() } });
      toast.success("活动已取消");
      setCancelId(null);
      setCancelReason("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "取消失败");
    } finally {
      setBusyId(null);
    }
  }

  if (isPending) return <PageLoading label="正在进入俱乐部" />;
  if (!user) {
    return (
      <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-2xl font-bold tracking-tight">俱乐部</h1>
        <div className="mt-8 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
          <p className="font-display text-lg font-semibold">登录后管理你的局</p>
          <Button asChild className="mt-5"><Link to="/login">登录 / 注册</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-2xl font-bold tracking-tight">俱乐部</h1>
      <p className="mt-1 text-sm text-muted">报名审核、活动编辑、俱乐部资料。</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button asChild variant="outline"><Link to="/me/events/new">发布活动</Link></Button>
        <Button asChild variant="outline"><Link to="/me/club">创建俱乐部</Link></Button>
        <Button asChild variant="outline"><Link to="/me/host">收款设置</Link></Button>
      </div>
      <Tabs defaultValue="inbox" className="mt-5">
        <TabsList className="grid-cols-3">
          <TabsTrigger value="inbox">报名{inbox && inbox.length > 0 ? ` ${inbox.length}` : ""}</TabsTrigger>
          <TabsTrigger value="events">活动</TabsTrigger>
          <TabsTrigger value="clubs">俱乐部</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          {inbox === null ? <PageLoading label="加载申请" compact /> : inbox.length === 0 ? (
            <div className="rounded-xl bg-surface px-4 py-10 text-center shadow-card"><p className="font-medium">还没有待确认的申请</p></div>
          ) : (
            <ul className="space-y-2">
              {inbox.map((row) => (
                <li key={row.id}>
                  <Link to="/manage/$eventId" params={{ eventId: row.eventId }} className="block rounded-xl bg-surface px-3 py-3 shadow-card">
                    <p className="font-medium">{row.nickname} · {row.seats} 人</p>
                    <p className="mt-0.5 truncate text-sm text-muted">{row.eventTitle}</p>
                    <p className="mt-1 text-xs text-muted">{row.applyNo} · {formatWhen(row.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="events">
          {events === null ? <PageLoading label="加载活动" compact /> : events.length === 0 ? (
            <div className="rounded-xl bg-surface px-4 py-10 text-center shadow-card"><p className="font-medium">还没有你发起的局</p></div>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => {
                const pending = pendingByEvent.get(event.id) ?? 0;
                const cancelled = event.status === "cancelled";
                return (
                  <li key={event.id} className="rounded-xl bg-surface p-2.5 shadow-card">
                    <Link to="/events/$slug" params={{ slug: event.slug }} className="flex gap-3">
                      <img src={event.coverUrl} alt="" className="size-14 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{event.title}</p>
                        <p className="text-xs text-muted">{formatWhen(event.startsAt, event.currency)} · {event.booked}/{event.capacity}</p>
                        {cancelled ? <p className="mt-1 text-xs font-medium text-danger">已取消</p> : pending > 0 ? <p className="mt-1 text-xs font-medium">{pending} 条待确认</p> : null}
                      </div>
                    </Link>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Button asChild variant="outline" size="sm"><Link to="/manage/$eventId" params={{ eventId: event.id }}>审核</Link></Button>
                      <Button asChild variant="outline" size="sm"><Link to="/club/events/$eventId" params={{ eventId: event.id }}><Pencil className="size-3.5" />编辑</Link></Button>
                      {cancelled ? (
                        <span />
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setCancelId(null);
                            setConfirmId(event.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          删除
                        </Button>
                      )}
                    </div>
                    {cancelled ? null : confirmId === event.id ? (
                      <div className="mt-2 rounded-lg bg-paper px-3 py-2">
                        <p className="text-sm">删除后不能恢复。确定删掉这场活动？</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>再想想</Button>
                          <Button variant="ink" size="sm" disabled={busyId === event.id} onClick={() => void onDelete(event)}>
                            {busyId === event.id ? "删除中…" : "确认删除"}
                          </Button>
                        </div>
                      </div>
                    ) : cancelId === event.id ? (
                      <div className="mt-2 space-y-2 rounded-lg bg-paper px-3 py-2">
                        <p className="text-sm">已有人报名，不能直接删除，只能取消并通知报名者。</p>
                        <Textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="取消原因（必填）"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setCancelId(null); setCancelReason(""); }}>返回</Button>
                          <Button variant="ink" size="sm" disabled={busyId === event.id || cancelReason.trim().length < 2} onClick={() => void onCancel(event)}>
                            {busyId === event.id ? "取消中…" : "确认取消"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="clubs">
          {clubs === null ? <PageLoading label="加载俱乐部" compact /> : clubs.length === 0 ? (
            <div className="rounded-xl bg-surface px-4 py-10 text-center shadow-card">
              <p className="font-medium">还没有俱乐部</p>
              <Button asChild className="mt-4"><Link to="/me/club">创建一个</Link></Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {clubs.map((club) => (
                <li key={club.id} className="rounded-xl bg-surface p-3 shadow-card">
                  <p className="font-medium">{club.name}</p>
                  <p className="text-xs text-muted">{cityName(club.city as "penang")} · {club.eventCount} 场</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm"><Link to="/clubs/$id" params={{ id: club.id }}>主页</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link to="/club/edit/$id" params={{ id: club.id }}>编辑</Link></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/clubs" className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-3 text-sm shadow-card">
            <span className="flex items-center gap-2"><Users className="size-4 text-muted" />逛所有俱乐部</span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        </TabsContent>
      </Tabs>
    </main>
  );
}

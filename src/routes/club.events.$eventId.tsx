import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { EventForm, draftFromEvent, parseEventDraft, type EventDraft } from "@/components/event-form";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getEditEvent, saveEventEdits } from "@/lib/server/event-edit";
import { listMyClubs } from "@/lib/server/clubs";
import type { ClubRecord } from "@/lib/types";

export const Route = createFileRoute("/club/events/$eventId")({ component: EditEventPage });

function EditEventPage() {
  const { eventId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([getEditEvent({ data: { eventId } }), listMyClubs()])
      .then(([event, rows]) => {
        setClubs(rows);
        if (!event) {
          toast.error("找不到这场活动");
          return;
        }
        const next = draftFromEvent(event);
        if (!next.clubId && rows[0]) next.clubId = rows[0].id;
        setDraft(next);
      })
      .catch(() => toast.error("加载失败"));
  }, [user?.id, eventId]);

  if (isPending || !draft) {
    if (!user && !isPending) return <RedirectToSignIn />;
    return (
      <main>
        <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Link to="/club" className="flex size-11 items-center justify-center" aria-label="返回"><ArrowLeft className="size-5" /></Link>
          <h1 className="font-display text-lg font-semibold">编辑活动</h1>
        </header>
        <PageLoading label="正在打开活动…" />
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      const parsed = parseEventDraft(draft);
      if (!parsed.title || !parsed.venue) {
        toast.error("标题和地点都要有");
        return;
      }
      if (!parsed.clubId) {
        toast.error("请选择俱乐部");
        return;
      }
      const saved = await saveEventEdits({
        data: {
          eventId,
          clubId: parsed.clubId,
          title: parsed.title,
          subtitle: parsed.subtitle,
          category: parsed.category,
          city: parsed.city,
          venue: parsed.venue,
          address: parsed.address,
          lat: parsed.lat,
          lng: parsed.lng,
          startsAt: parsed.startsAt,
          endsAt: parsed.endsAt,
          price: parsed.price,
          capacity: parsed.capacity,
          coverUrl: parsed.coverUrl,
          description: parsed.description,
          highlights: parsed.highlights,
          hostNote: parsed.hostNote,
          level: parsed.level,
          body: parsed.body,
          refundHours: parsed.refundHours,
          refundFeePercent: parsed.refundFeePercent,
        },
      });
      toast.success("已保存");
      await router.invalidate();
      await navigate({ to: "/events/$slug", params: { slug: saved.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-1 bg-paper/95 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
        <Link to="/club" className="flex size-11 items-center justify-center" aria-label="返回"><ArrowLeft className="size-5" /></Link>
        <h1 className="font-display text-lg font-semibold">编辑活动</h1>
      </header>
      <div className="px-4">
        <EventForm clubs={clubs} allowNewClub={false} value={draft} onChange={setDraft} busy={busy} submitLabel="保存修改" onSubmit={(e) => void submit(e)} />
      </div>
    </main>
  );
}

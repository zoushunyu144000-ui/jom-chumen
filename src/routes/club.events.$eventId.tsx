import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  EventForm,
  draftFromEvent,
  parseEventDraft,
  type EventDraft,
} from "@/components/event-form";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getHostEvent } from "@/lib/server/admin";
import { listMyClubs, updateEvent } from "@/lib/server/clubs";
import type { ClubRecord } from "@/lib/types";

export const Route = createFileRoute("/club/events/$eventId")({
  component: EditEventPage,
});

function EditEventPage() {
  const { eventId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getHostEvent({ data: { eventId } }),
      listMyClubs(),
    ])
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

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const parsed = parseEventDraft(draft);
    if (!parsed.title || !parsed.venue || !parsed.coverUrl) {
      toast.error("标题、地点和封面都要有");
      return;
    }
    if (!parsed.clubId) {
      toast.error("请选择俱乐部");
      return;
    }
    setBusy(true);
    try {
      await updateEvent({
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
        },
      });
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
      <header className="sticky top-0 z-20 flex items-center gap-1 bg-paper/95 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
        <Link to="/club" className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">编辑活动</h1>
      </header>
      <div className="px-4">
        {draft ? (
          <EventForm
            clubs={clubs}
            allowNewClub={false}
            value={draft}
            onChange={setDraft}
            busy={busy}
            submitLabel="保存修改"
            onSubmit={(e) => void submit(e)}
          />
        ) : (
          <p className="py-8 text-sm text-muted">加载中…</p>
        )}
      </div>
    </main>
  );
}

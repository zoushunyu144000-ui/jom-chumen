import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { EventForm, emptyEventDraft, parseEventDraft, type EventDraft } from "@/components/event-form";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isRealQr, isRealWhatsapp } from "@/lib/pay";
import { createClub, createEvent, listMyClubs } from "@/lib/server/clubs";
import { saveEventPolicy } from "@/lib/server/event-policy";
import { getHostSettings } from "@/lib/server/profile";
import type { ClubRecord } from "@/lib/types";

export const Route = createFileRoute("/me/events/new")({ component: NewEventPage });

function NewEventPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [draft, setDraft] = useState<EventDraft>(() => emptyEventDraft());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    listMyClubs()
      .then((rows) => {
        setClubs(rows);
        if (rows[0]) setDraft((d) => ({ ...d, clubId: rows[0].id }));
      })
      .catch(() => setClubs([]));
  }, [user?.id]);

  if (isPending) return <PageLoading label="准备发布" />;
  if (!user) return <RedirectToSignIn />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const parsed = parseEventDraft(draft);
      if (!parsed.title || !parsed.venue || !parsed.coverUrl) {
        toast.error("标题、地点和封面都要有");
        return;
      }
      const host = await getHostSettings().catch(() => null);
      if (!host || !isRealWhatsapp(host.whatsapp) || !isRealQr(host.tng_qr)) {
        toast.error("发布前先去填客服 WhatsApp 和 TNG 收款码");
        await navigate({ to: "/me/host" });
        return;
      }
      let cid = parsed.clubId;
      if (!cid) {
        if (!parsed.newClubName) {
          toast.error("先给俱乐部起个名字");
          return;
        }
        const club = await createClub({
          data: { name: parsed.newClubName, bio: "", city: parsed.city, coverUrl: parsed.coverUrl },
        });
        cid = club.id;
      }
      const created = await createEvent({
        data: {
          clubId: cid,
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
      await saveEventPolicy({
        data: {
          slug: created.slug,
          refundHours: Number(draft.refundHours) || 24,
          refundFeePercent: Number(draft.refundFeePercent) || 50,
          galleryCount: Math.max(0, draft.photos.filter(Boolean).length - 1),
        },
      }).catch(() => undefined);
      toast.success("活动已发布");
      await router.invalidate();
      await navigate({ to: "/events/$slug", params: { slug: created.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发布失败");
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
        <h1 className="font-display text-lg font-semibold">发起活动</h1>
      </header>
      <div className="px-4">
        <EventForm clubs={clubs} allowNewClub value={draft} onChange={setDraft} busy={busy} submitLabel="发布活动" onSubmit={(e) => void submit(e)} />
      </div>
    </main>
  );
}

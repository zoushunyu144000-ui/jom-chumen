import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ClubCalendar } from "@/components/club-calendar";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { cityName } from "@/lib/catalog";
import { getClub, listMyClubs } from "@/lib/server/clubs";
import { listEvents } from "@/lib/server/events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/clubs/$id")({
  loader: async ({ params }) => {
    const club = await getClub({ data: { id: params.id } });
    if (!club) throw notFound();
    const events = await listEvents({ data: { clubId: club.id } });
    return { club, events };
  },
  notFoundComponent: () => (
    <main className="px-6 py-20 text-center">
      <p className="font-display text-xl font-semibold">找不到这个俱乐部</p>
      <Link to="/clubs" className="mt-4 inline-block text-sm text-muted underline">
        返回
      </Link>
    </main>
  ),
  component: ClubDetail,
});

function ClubDetail() {
  const { club, events } = Route.useLoaderData();
  const { user } = useCurrentUserState();
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    if (!user) return;
    listMyClubs()
      .then((rows) => setOwner(rows.some((row) => row.id === club.id)))
      .catch(() => setOwner(false));
  }, [user, club.id]);

  const { upcoming, past } = useMemo(() => {
    const stamp = Date.now();
    const upcoming = events
      .filter((event) => new Date(event.endsAt).getTime() >= stamp)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    const past = events
      .filter((event) => new Date(event.endsAt).getTime() < stamp)
      .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
    return { upcoming, past };
  }, [events]);

  return (
    <main className="pb-8">
      <div className="relative">
        {club.coverUrl ? (
          <img
            src={club.coverUrl}
            alt=""
            className="aspect-2/1 w-full object-cover"
          />
        ) : (
          <div className="aspect-2/1 bg-ink" />
        )}
        <Link
          to="/clubs"
          className="absolute left-3 top-3 flex size-11 items-center justify-center rounded-full bg-paper/90 shadow-card"
          aria-label="返回"
        >
          <ArrowLeft className="size-5" />
        </Link>
      </div>
      <section className="px-4 pt-4">
        <p className="text-xs text-muted">{cityName(club.city)}</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
          {club.name}
        </h1>
        {club.bio ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{club.bio}</p>
        ) : null}
        {owner ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild>
              <Link to="/me/events/new">发起活动</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/club/edit/$id" params={{ id: club.id }}>
                编辑资料
              </Link>
            </Button>
          </div>
        ) : null}
      </section>

      <section className="mt-6 px-4">
        <h2 className="font-display text-lg font-semibold">日历安排</h2>
        <div className="mt-3">
          <ClubCalendar events={events} />
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="font-display text-lg font-semibold">即将开始</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted">暂时没有新的局。</p>
        ) : (
          <div className="mt-3 grid gap-5">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 px-4">
        <h2 className="font-display text-lg font-semibold">往期活动</h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-muted">还没有往期记录。</p>
        ) : (
          <div className="mt-3 grid gap-5">
            {past.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

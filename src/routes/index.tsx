import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CityBar } from "@/components/city-bar";
import { EventCard } from "@/components/event-card";
import { FeedSkeleton } from "@/components/page-loading";
import { CATEGORIES } from "@/lib/catalog";
import { listEventCards } from "@/lib/server/event-cards";
import { eventMatchesPlace } from "@/lib/places";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: async () => ({ events: await listEventCards() }),
  staleTime: 5 * 60_000,
  gcTime: 10 * 60_000,
  pendingMs: 0,
  pendingComponent: () => <FeedSkeleton label="加载中" />,
  component: Home,
});

function Home() {
  const { events } = Route.useLoaderData();
  const place = useAppStore((s) => s.place);
  const category = useAppStore((s) => s.category);
  const query = useAppStore((s) => s.query);
  const setCategory = useAppStore((s) => s.setCategory);
  const [searching, setSearching] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (new Date(event.endsAt).getTime() < Date.now()) return false;
      if (!eventMatchesPlace(event, place)) return false;
      if (category !== "all" && event.category !== category) return false;
      if (!q) return true;
      return `${event.title} ${event.subtitle} ${event.venue} ${event.hostName}`.toLowerCase().includes(q);
    });
  }, [events, place, category, query]);

  const featured = filtered[0];
  const rest = filtered.slice(featured ? 1 : 0);

  return (
    <main className="pb-6">
      <CityBar searching={searching} onToggleSearch={() => setSearching((v) => !v)} />
      <section className="px-4 pt-1">
        <p className="text-sm text-muted">东南亚兴趣局，随时出门。</p>
      </section>
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
              category === item.id ? "bg-ink text-lime" : "bg-surface text-ink-soft shadow-card",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="mt-4 px-4">{featured ? <EventCard event={featured} featured /> : null}</div>
      <section className="mt-6 px-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">即将开始</h2>
          <span className="text-xs text-muted tabular-nums">{filtered.length} 场</span>
        </div>
        {rest.length === 0 && !featured ? (
          <div className="rounded-xl bg-surface px-4 py-10 text-center shadow-card">
            <p className="font-medium">这一带暂时没有局</p>
            <p className="mt-1 text-sm text-muted">换个城市或分类看看</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {rest.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

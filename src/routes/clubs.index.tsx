import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { listClubs } from "@/lib/server/clubs";
import { cityName } from "@/lib/catalog";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clubs/")({
  loader: async () => ({ clubs: await listClubs({ data: {} }) }),
  component: ClubsPage,
});

function ClubsPage() {
  const { clubs } = Route.useLoaderData();
  const place = useAppStore((s) => s.place);
  const filtered = place.world
    ? clubs.filter((club) =>
        club.city === place.cityId ||
        club.name.includes(place.cityName) ||
        club.city === place.cityId,
      )
    : place.cityId === "all"
      ? clubs
      : clubs.filter((club) => club.city === place.cityId);

  return (
    <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-end justify-between">
        <div>
          <Link to="/club" className="mb-2 flex items-center gap-1 text-sm text-muted">
            <ArrowLeft className="size-4" />
            俱乐部
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            所有俱乐部
          </h1>
          <p className="mt-1 text-sm text-muted">发起人的据点，活动从这里长出来。</p>
        </div>
        <Button asChild size="sm">
          <Link to="/me/club">创建</Link>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
          <p className="font-medium">这里还没有俱乐部</p>
          <p className="mt-1 text-sm text-muted">登录后可以建一个，再发活动。</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {filtered.map((club) => (
            <li key={club.id}>
              <Link
                to="/clubs/$id"
                params={{ id: club.id }}
                className="block overflow-hidden rounded-xl bg-surface shadow-card"
              >
                {club.coverUrl ? (
                  <img
                    src={club.coverUrl}
                    alt=""
                    className="aspect-2/1 w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-2/1 items-end bg-ink px-4 py-3">
                    <span className="font-display text-xl font-bold text-lime">
                      {club.name}
                    </span>
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium">{club.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                    {club.bio || cityName(club.city)}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {cityName(club.city)} · {club.eventCount} 场活动
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

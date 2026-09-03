import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { listEventAttendees, type Attendee } from "@/lib/server/people";

function Face({ person }: { person: Attendee }) {
  if (person.avatarUrl) {
    return <img src={person.avatarUrl} alt="" className="size-9 rounded-full object-cover" />;
  }
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-lime text-xs font-bold">
      {(person.name || "?").slice(0, 1)}
    </span>
  );
}

const GENDER: Record<string, string> = { female: "女", male: "男", other: "其他" };

export function EventPeople({ slug, booked }: { slug: string; booked: number }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Attendee[]>([]);
  const [open, setOpen] = useState<Attendee | null>(null);

  useEffect(() => {
    listEventAttendees({ data: { slug } }).then(setPeople).catch(() => setPeople([]));
  }, [slug]);

  if (booked <= 0 && people.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {people.slice(0, 8).map((person, i) => (
            <button
              key={`${person.userId || person.name}-${i}`}
              type="button"
              className="rounded-full ring-2 ring-paper"
              onClick={() => setOpen(person)}
            >
              <Face person={person} />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{people.length || booked} 人已报名</p>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/40" onClick={() => setOpen(null)}>
          <div className="w-full rounded-t-2xl bg-paper px-4 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="flex items-center gap-3">
              <Face person={open} />
              <div>
                <p className="font-medium">{open.name}</p>
                <p className="text-xs text-muted">{GENDER[open.gender] || "性别未填"}</p>
              </div>
            </div>
            {open.userId ? (
              <button
                type="button"
                className="mt-4 h-11 w-full rounded-lg bg-lime text-sm font-semibold"
                onClick={() => void navigate({ to: "/users/$id", params: { id: open.userId as string } })}
              >
                看他的主页
              </button>
            ) : (
              <p className="mt-4 text-sm text-muted">这位报名时沠有登录，沠有主页。</p>
            )}
            <button type="button" className="mt-2 h-11 w-full text-sm text-muted" onClick={() => setOpen(null)}>关闭</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

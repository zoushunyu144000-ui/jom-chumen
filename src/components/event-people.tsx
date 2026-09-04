import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listEventAttendees, type Attendee } from "@/lib/server/people";

function Face({ person }: { person: Attendee }) {
  const ring = person.pending ? "ring-2 ring-dashed ring-lime" : "ring-2 ring-paper";
  return (
    <span className={`relative rounded-full ${ring}`}>
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="size-8 rounded-full object-cover [outline:none]" />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-lime text-[11px] font-bold text-ink">
          {(person.name || "?").slice(0, 1)}
        </span>
      )}
    </span>
  );
}

const GENDER: Record<string, string> = { female: "女", male: "男", other: "其他" };

export function EventPeople({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Attendee[]>([]);
  const [open, setOpen] = useState<Attendee | null>(null);

  useEffect(() => {
    listEventAttendees({ data: { slug } }).then(setPeople).catch(() => setPeople([]));
  }, [slug]);

  if (people.length === 0) return null;
  const confirmed = people.filter((p) => !p.pending).length;

  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex -space-x-2">
        {people.slice(0, 6).map((person, i) => (
          <button key={`${person.userId || person.name}-${i}`} type="button" onClick={() => setOpen(person)}>
            <Face person={person} />
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">
        {confirmed} 人已确认{people.length > confirmed ? ` · ${people.length - confirmed} 预报名` : ""}
      </p>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/50" onClick={() => setOpen(null)}>
          <div className="w-full rounded-t-2xl bg-paper px-4 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="flex items-center gap-3">
              <Face person={open} />
              <div>
                <p className="font-medium">{open.name}</p>
                <p className="text-xs text-muted">{GENDER[open.gender] || "性别未填"}{open.pending ? " · 预报名" : " · 已确认"}</p>
              </div>
            </div>
            {open.userId ? (
              <button type="button" className="mt-4 h-11 w-full rounded-lg bg-lime text-sm font-semibold" onClick={() => void navigate({ to: "/users/$id", params: { id: open.userId as string } })}>
                进入主页
              </button>
            ) : (
              <p className="mt-4 text-sm text-muted">这位报名时没有登录账号。</p>
            )}
            <button type="button" className="mt-2 h-11 w-full text-sm text-muted" onClick={() => setOpen(null)}>关闭</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

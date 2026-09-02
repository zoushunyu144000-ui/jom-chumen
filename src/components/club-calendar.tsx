import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayKey, formatWhen } from "@/lib/format";
import type { EventRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEK = ["一", "二", "三", "四", "五", "六", "日"];

function klToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date());
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function cellsFor(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(`${monthKey}-01T12:00:00+08:00`);
  const startPad = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: Array<{ key: string; day: number | null }> = [];
  for (let i = 0; i < startPad; i += 1) cells.push({ key: `p-${i}`, day: null });
  for (let d = 1; d <= days; d += 1) {
    const key = `${monthKey}-${String(d).padStart(2, "0")}`;
    cells.push({ key, day: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `t-${cells.length}`, day: null });
  }
  return cells;
}

export function ClubCalendar({ events }: { events: EventRecord[] }) {
  const today = klToday();
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(today);

  const byDay = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const event of events) {
      const key = dayKey(event.startsAt, event.currency);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const cells = cellsFor(monthKey);
  const picked = selected ? (byDay.get(selected) ?? []) : [];
  const [y, m] = monthKey.split("-");

  return (
    <div className="rounded-xl bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex size-11 items-center justify-center"
          aria-label="上个月"
          onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-display text-base font-semibold">
          {y}年{Number(m)}月
        </p>
        <button
          type="button"
          className="flex size-11 items-center justify-center"
          aria-label="下个月"
          onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-xs text-muted">
        {WEEK.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          if (cell.day === null) return <span key={cell.key} className="h-11" />;
          const has = (byDay.get(cell.key)?.length ?? 0) > 0;
          const active = selected === cell.key;
          const isToday = cell.key === today;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelected(cell.key)}
              className={cn(
                "relative flex h-11 items-center justify-center rounded-md text-sm",
                active && "bg-lime font-semibold",
                !active && isToday && "font-semibold",
              )}
            >
              {cell.day}
              {has ? (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    active ? "bg-ink" : "bg-lime-deep",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {picked.length > 0 ? (
        <ul className="mt-2 space-y-1 border-t border-line pt-2">
          {picked.map((event) => (
            <li key={event.id}>
              <Link
                to="/events/$slug"
                params={{ slug: event.slug }}
                className="block rounded-md px-2 py-2 hover:bg-paper-2"
              >
                <span className="block truncate text-sm font-medium">
                  {event.title}
                </span>
                <span className="text-xs text-muted">
                  {formatWhen(event.startsAt, event.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 border-t border-line pt-3 text-center text-xs text-muted">
          这一天没有安排
        </p>
      )}
    </div>
  );
}

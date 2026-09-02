import { Link } from "@tanstack/react-router";
import { ChevronDown, Search, X } from "lucide-react";
import { placeChip } from "@/lib/places";
import { useAppStore } from "@/lib/store";

export function CityBar({
  searching,
  onToggleSearch,
}: {
  searching: boolean;
  onToggleSearch: () => void;
}) {
  const place = useAppStore((s) => s.place);
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);

  return (
    <header className="sticky top-0 z-20 bg-paper/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Jom
          </span>
          <span className="text-xs text-muted">出门局</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/city"
            className="flex h-11 max-w-40 items-center gap-1 rounded-full bg-surface px-3 text-sm font-medium shadow-card"
          >
            <span className="truncate">{placeChip(place)}</span>
            <ChevronDown className="size-4 shrink-0 text-muted" />
          </Link>
          <button
            type="button"
            onClick={onToggleSearch}
            className="flex size-11 items-center justify-center rounded-full bg-surface shadow-card"
            aria-label="搜索"
          >
            {searching ? <X className="size-4" /> : <Search className="size-4" />}
          </button>
        </div>
      </div>
      {searching ? (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜活动、场地、发起人"
          className="mt-3 h-11 w-full rounded-md bg-surface px-3 text-sm shadow-card outline-none placeholder:text-muted"
        />
      ) : null}
    </header>
  );
}

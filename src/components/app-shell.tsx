import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, MessageCircle, Plus, UserRound, Users } from "lucide-react";
import { Toaster } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pendingHostCount } from "@/lib/server/admin";
import { unreadCount } from "@/lib/server/messages";
import { rehydrateAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUserState();
  const [unread, setUnread] = useState(0);
  const [pending, setPending] = useState(0);
  const hideNav =
    pathname.startsWith("/events/") ||
    pathname.startsWith("/ticket/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/city") ||
    pathname.startsWith("/me/club") ||
    pathname.startsWith("/me/events") ||
    pathname.startsWith("/me/profile") ||
    pathname.startsWith("/me/host") ||
    pathname.startsWith("/me/applies") ||
    pathname.startsWith("/apply/") ||
    pathname.startsWith("/manage") ||
    pathname.startsWith("/lookup") ||
    pathname.startsWith("/club/events") ||
    pathname.startsWith("/club/edit");

  const clubActive =
    pathname === "/club" || pathname === "/club/" || pathname.startsWith("/club/");

  useEffect(() => {
    rehydrateAppStore();
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      setPending(0);
      return;
    }
    unreadCount().then(setUnread).catch(() => setUnread(0));
    pendingHostCount().then(setPending).catch(() => setPending(0));
  }, [user?.id]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-paper text-ink">
      <div className="relative mx-auto min-h-dvh w-full max-w-md bg-paper">
        <div className={hideNav ? undefined : "pb-24"}>{children}</div>
        {hideNav ? null : (
          <nav className="fixed inset-x-0 bottom-0 z-40">
            <div className="relative mx-auto grid max-w-md grid-cols-5 border-t border-line bg-paper pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
              <Tab to="/" label="发现" icon={Compass} active={pathname === "/"} />
              <Tab to="/club" label="俱乐部" icon={Users} active={clubActive} badge={pending} />
              <Link to="/me/events/new" preload={false} aria-label="发布活动" className="relative flex flex-col items-center">
                <span className="-mt-7 flex size-14 items-center justify-center rounded-full bg-lime text-ink shadow-card">
                  <Plus className="size-7" strokeWidth={2.5} />
                </span>
                <span className="mt-1 text-[11px] font-medium text-ink">发布</span>
              </Link>
              <Tab to="/messages" label="消息" icon={MessageCircle} active={pathname.startsWith("/messages")} badge={unread} />
              <Tab to="/me" label="我的" icon={UserRound} active={pathname.startsWith("/me")} />
            </div>
          </nav>
        )}
      </div>
      <Toaster position="top-center" toastOptions={{ className: "!bg-ink !text-lime !border-0 !font-sans !rounded-lg !shadow-card" }} />
    </div>
  );
}

function Tab({
  to,
  label,
  icon: Icon,
  active,
  badge = 0,
}: {
  to: "/" | "/me" | "/messages" | "/club";
  label: string;
  icon: typeof Compass;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      preload={false}
      className={cn(
        "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
        active ? "text-ink" : "text-muted",
      )}
    >
      <span className="relative">
        <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
        {badge > 0 ? (
          <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 text-surface">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}

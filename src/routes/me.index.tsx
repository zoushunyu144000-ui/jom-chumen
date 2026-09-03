import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, Pencil, Search, Ticket } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/server/profile";
import type { ProfileRecord } from "@/lib/types";

export const Route = createFileRoute("/me/")({ component: MePage });

function MePage() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setWaited(true), 2200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    getProfile()
      .then(setProfile)
      .catch(() => setProfile({ displayName: "", avatarUrl: "", tags: [] }));
  }, [user?.id]);

  const displayName = profile?.displayName?.trim() || user?.displayName || "Jom 用户";
  const avatar = profile?.avatarUrl || user?.profileImageUrl || "";
  const tags = profile?.tags ?? [];

  return (
    <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">我的</h1>
        {user ? <UserButton /> : null}
      </div>

      {user ? (
        <>
          <Link
            to="/me/profile"
            className="mt-5 block rounded-xl bg-surface p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="size-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-lime font-display text-2xl font-bold">
                  {displayName.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-semibold leading-tight">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {user.primaryEmail ?? ""}
                </p>
                {tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">添加个性标签，让别人认识你</p>
                )}
              </div>
              <span className="mt-1 flex size-8 items-center justify-center rounded-full bg-paper-2 text-muted">
                <Pencil className="size-3.5" />
              </span>
            </div>
          </Link>

          <ul className="mt-4 overflow-hidden rounded-xl bg-surface shadow-card">
            <Row href="/tickets" icon={Ticket} label="票夹" hint="报名成功的电子票" />
            <Row href="/me/applies" icon={ClipboardList} label="我的申请" hint="待确认 / 已拒绝" />
            <Row href="/me/host" icon={Search} label="收款与客服" hint="WhatsApp 和收款码" />
            <Row href="/lookup" icon={Search} label="查询报名" hint="用报名号或 WhatsApp" last />
          </ul>
        </>
      ) : (
        <div className="mt-8 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
          {isPending && !waited ? (
            <>
              <Skeleton className="mx-auto size-16 rounded-full" />
              <Skeleton className="mx-auto mt-4 h-5 w-36" />
              <p className="mt-6 text-sm text-muted">正在确认登录状态…</p>
              <Button asChild className="mt-5" variant="outline">
                <Link to="/login">去登录</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-semibold">还沠有账号</p>
              <p className="mt-1 text-sm text-muted">
                登录后可以改资料、建俱乐部、审核报名。
              </p>
              <Button asChild className="mt-5">
                <Link to="/login">登录 / 注册</Link>
              </Button>
            </>
          )}
          <div className="mt-6 grid grid-cols-2 gap-2 text-left">
            <Link to="/tickets" className="rounded-lg bg-paper-2 px-3 py-3 text-sm">
              票夹
            </Link>
            <Link to="/club" className="rounded-lg bg-paper-2 px-3 py-3 text-sm">
              俱乐部
            </Link>
            <Link to="/me/applies" className="rounded-lg bg-paper-2 px-3 py-3 text-sm">
              我的申请
            </Link>
            <Link to="/lookup" className="rounded-lg bg-paper-2 px-3 py-3 text-sm">
              查询报名
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({
  href,
  icon: Icon,
  label,
  hint,
  last,
}: {
  href: string;
  icon: typeof Ticket;
  label: string;
  hint: string;
  last?: boolean;
}) {
  return (
    <li className={last ? undefined : "border-b border-line"}>
      <a href={href} className="flex items-center gap-3 px-3 py-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-paper-2">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted">{hint}</span>
        </span>
        <ChevronRight className="size-4 text-muted" />
      </a>
    </li>
  );
}

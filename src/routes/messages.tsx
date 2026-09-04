import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMessages, markRead } from "@/lib/server/messages";
import { listMyChats, type ChatListItem } from "@/lib/server/chat";
import type { MessageRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({ component: MessagesPage });

function MessagesPage() {
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<"notice" | "chat">("notice");
  const [rows, setRows] = useState<MessageRecord[] | null>(null);
  const [chats, setChats] = useState<ChatListItem[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listMessages().then(setRows).catch(() => setRows([]));
    listMyChats().then(setChats).catch(() => setChats([]));
  }, [user]);

  if (isPending) return <PageLoading label="打开消息" />;
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-2xl font-bold tracking-tight">消息</h1>
      <div className="mt-4 grid grid-cols-2 rounded-full bg-surface p-1 shadow-card">
        <button type="button" onClick={() => setTab("notice")} className={cn("h-9 rounded-full text-sm font-medium", tab === "notice" ? "bg-lime" : "text-muted")}>通知</button>
        <button type="button" onClick={() => setTab("chat")} className={cn("h-9 rounded-full text-sm font-medium", tab === "chat" ? "bg-lime" : "text-muted")}>私信</button>
      </div>
      {tab === "notice" ? (
        rows === null ? (
          <PageLoading label="加载通知" />
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
            <p className="font-medium">还没有通知</p>
            <p className="mt-1 text-sm text-muted">报名审核结果会放在这里。</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <a href={row.href || "/me"} onClick={() => void markRead({ data: { id: row.id } })} className={cn("block rounded-xl px-3 py-3 shadow-card", row.read ? "bg-surface" : "bg-lime/40")}>
                  <p className="font-medium">{row.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{row.body}</p>
                </a>
              </li>
            ))}
          </ul>
        )
      ) : chats === null ? (
        <PageLoading label="加载私信" compact />
      ) : chats.length === 0 ? (
        <div className="mt-10 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
          <p className="font-medium">还没有私信</p>
          <p className="mt-1 text-sm text-muted">活动页点「联系主办」就会出现在这里。</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link to="/chat/$id" params={{ id: chat.id }} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-3 shadow-card">
                {chat.avatarUrl ? (
                  <img src={chat.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime text-sm font-semibold">
                    {chat.title.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{chat.title}</p>
                    {chat.unread > 0 ? (
                      <span className="rounded-full bg-ink px-1.5 text-[10px] font-semibold text-lime">{chat.unread > 9 ? "9+" : chat.unread}</span>
                    ) : null}
                  </span>
                  <p className="mt-0.5 truncate text-sm text-muted">{chat.last || "点开聊天"}</p>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

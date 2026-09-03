import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
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

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
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
          <p className="mt-6 text-sm text-muted">加载中…</p>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
            <p className="font-medium">还沠有通知</p>
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
        <p className="mt-6 text-sm text-muted">加载中…</p>
      ) : chats.length === 0 ? (
        <div className="mt-10 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
          <p className="font-medium">还沠有私信</p>
          <p className="mt-1 text-sm text-muted">活动页点「联系主办」就会出现在这里。</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link to="/chat/$id" params={{ id: chat.id }} className="block rounded-xl bg-surface px-3 py-3 shadow-card">
                <p className="font-medium">{chat.title}</p>
                <p className="mt-0.5 truncate text-sm text-muted">{chat.last || "点开聊天"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMessages, markRead } from "@/lib/server/messages";
import type { MessageRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages")({ component: MessagesPage });

function MessagesPage() {
  const { user, isPending } = useCurrentUserState();
  const [rows, setRows] = useState<MessageRecord[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listMessages()
      .then(setRows)
      .catch(() => setRows([]));
  }, [user]);

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-2xl font-bold tracking-tight">消息</h1>
      {rows === null ? (
        <p className="mt-6 text-sm text-muted">加载中…</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-xl bg-surface px-4 py-10 text-center shadow-card">
          <p className="font-medium">还没有消息</p>
          <p className="mt-1 text-sm text-muted">报名审核结果会放在这里。</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <a
                href={row.href || "/me"}
                onClick={() => void markRead({ data: { id: row.id } })}
                className={cn(
                  "block rounded-xl px-3 py-3 shadow-card",
                  row.read ? "bg-surface" : "bg-lime/40",
                )}
              >
                <p className="font-medium">{row.title}</p>
                <p className="mt-0.5 text-sm text-muted">{row.body}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

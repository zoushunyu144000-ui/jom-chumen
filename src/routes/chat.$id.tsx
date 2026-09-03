import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listChatMessages, openClubChat, sendChatMessage, type ChatMessage } from "@/lib/server/chat";
import { openUserChat } from "@/lib/server/people";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$id")({ component: ChatPage });

function ChatPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [title, setTitle] = useState("私信");
  const [rows, setRows] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        let chatId = id;
        if (id.startsWith("club_")) {
          const opened = await openClubChat({ data: { clubId: id } });
          if (cancelled) return;
          if (opened.id !== id) {
            await navigate({ to: "/chat/$id", params: { id: opened.id }, replace: true });
            return;
          }
          chatId = opened.id;
        } else if (!id.startsWith("chat_")) {
          const opened = await openUserChat({ data: { userId: id } });
          if (cancelled) return;
          await navigate({ to: "/chat/$id", params: { id: opened.id }, replace: true });
          return;
        }
        const data = await listChatMessages({ data: { chatId } });
        if (cancelled) return;
        setTitle(data.title);
        setRows(data.messages);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          toast.error(err instanceof Error ? err.message : "私信打不开");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows]);

  if (isPending) return <main className="p-6 text-sm text-muted">加载中…</main>;
  if (!user) return <RedirectToSignIn />;

  async function send(kind: ChatMessage["kind"], body: string, fileName = "") {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await sendChatMessage({ data: { chatId: id, kind, body, fileName } });
      setText("");
      const data = await listChatMessages({ data: { chatId: id } });
      setRows(data.messages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined, kind: "image" | "file") {
    if (!file) return;
    try {
      if (kind === "image") {
        const src = await compressImage(file, { maxEdge: 1000, quality: 0.7, maxChars: 220_000 });
        await send("image", src, file.name);
      } else {
        if (file.size > 400_000) throw new Error("文件请小于 400KB");
        const src = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("读取失败"));
          reader.readAsDataURL(file);
        });
        await send("file", src, file.name);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/messages" className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">{title}</h1>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
        {rows === null ? <p className="pt-8 text-center text-sm text-muted">正在打开私信…</p> : null}
        {(rows ?? []).map((row) => (
          <div key={row.id} className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-card", row.mine ? "ml-auto bg-lime" : "bg-surface")}>
            {row.kind === "image" ? (
              <img src={row.body} alt="" className="max-h-48 rounded-md object-cover" />
            ) : row.kind === "file" ? (
              <a href={row.body} download={row.fileName} className="underline">{row.fileName || "文件"}</a>
            ) : (
              <p className="whitespace-pre-wrap">{row.body}</p>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="flex items-center gap-2 border-t border-line px-3 py-2" onSubmit={(e) => { e.preventDefault(); void send("text", text); }}>
        <label className="flex size-10 items-center justify-center rounded-full bg-surface">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0], "image")} />
          <ImagePlus className="size-4" />
        </label>
        <label className="flex size-10 items-center justify-center rounded-full bg-surface">
          <input type="file" className="hidden" onChange={(e) => void onFile(e.target.files?.[0], "file")} />
          <Paperclip className="size-4" />
        </label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="说点什么…" />
        <Button type="submit" size="sm" disabled={busy || !text.trim()}><Send className="size-4" /></Button>
      </form>
    </main>
  );
}

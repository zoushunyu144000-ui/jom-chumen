import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listChatMessages, sendChatMessage, type ChatMessage } from "@/lib/server/chat";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$id")({ component: ChatPage });

function ChatPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [chatId, setChatId] = useState(id);
  const [title, setTitle] = useState("私信");
  const [rows, setRows] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [bottom, setBottom] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) {
        setBottom(0);
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setBottom(inset);
    };
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("focusin", sync);
    window.addEventListener("focusout", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("focusin", sync);
      window.removeEventListener("focusout", sync);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    listChatMessages({ data: { chatId: id } })
      .then((data) => {
        setChatId(data.id);
        setTitle(data.title);
        setRows(data.messages);
      })
      .catch((err) => {
        setRows([]);
        toast.error(err instanceof Error ? err.message : "私信打不开");
      });
  }, [user, id]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [rows, bottom]);

  if (isPending) return <PageLoading label="打开私信" />;
  if (!user) return <RedirectToSignIn />;

  async function send(kind: ChatMessage["kind"], body: string, fileName = "") {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const sent = await sendChatMessage({ data: { chatId, kind, body, fileName } });
      setChatId(sent.chatId);
      setText("");
      const data = await listChatMessages({ data: { chatId: sent.chatId } });
      setRows(data.messages);
      inputRef.current?.focus();
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
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-paper">
      <header className="flex items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/messages" className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">{title}</h1>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4" style={{ paddingBottom: bottom + 72 }}>
        {rows === null ? <PageLoading label="拉取消息" /> : null}
        {(rows ?? []).map((row) => (
          <div key={row.id} className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-card", row.mine ? "ml-auto bg-lime" : "bg-surface")}>
            {row.kind === "image" ? <img src={row.body} alt="" className="max-h-48 rounded-md object-cover" /> : row.kind === "file" ? (
              <a href={row.body} download={row.fileName} className="underline">{row.fileName || "文件"}</a>
            ) : <p className="whitespace-pre-wrap">{row.body}</p>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="fixed inset-x-0 z-40 mx-auto flex w-full max-w-md items-center gap-2 border-t border-line bg-paper px-3 py-2"
        style={{ bottom }}
        onSubmit={(e) => {
          e.preventDefault();
          void send("text", text);
        }}
      >
        <label className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0], "image")} />
          <ImagePlus className="size-4" />
        </label>
        <label className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
          <input type="file" className="hidden" onChange={(e) => void onFile(e.target.files?.[0], "file")} />
          <Paperclip className="size-4" />
        </label>
        <Input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="说点什么…" autoComplete="off" enterKeyHint="send" />
        <Button type="submit" size="sm" disabled={busy || !text.trim()}><Send className="size-4" /></Button>
      </form>
    </main>
  );
}

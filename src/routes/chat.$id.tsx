import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Send, Smile } from "lucide-react";
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

const EMOJIS = ["😊", "😂", "❤️", "👍", "🙏", "🔥", "✨", "🎉", "👋", "💪", "🤔", "😍", "😅", "🙌", "😎", "💯"];

function ChatPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [chatId, setChatId] = useState(id);
  const [title, setTitle] = useState("私信");
  const [rows, setRows] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [bottom, setBottom] = useState(0);
  const [preview, setPreview] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) return setBottom(0);
      setBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
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

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
        const src = await compressImage(file, { maxEdge: 1200, quality: 0.74, maxChars: 280_000 });
        await send("image", src, file.name);
        return;
      }
      if (file.size > 400_000) throw new Error("文件请小于 400KB");
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("读取失败"));
        reader.readAsDataURL(file);
      });
      await send("file", src, file.name);
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
        <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
      </header>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3" style={{ paddingBottom: bottom + (showEmoji ? 168 : 88) }}>
        {rows === null ? <PageLoading label="拉取消息" /> : null}
        {(rows ?? []).map((row) => (
          <div key={row.id} className={cn("flex", row.mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[78%] rounded-2xl text-[15px] leading-snug", row.kind === "image" ? "overflow-hidden bg-transparent p-0" : row.mine ? "bg-lime px-3 py-1.5" : "bg-surface px-3 py-1.5")}>
              {row.kind === "image" ? (
                <button type="button" onClick={() => setPreview(row.body)}>
                  <img src={row.body} alt="" className="max-h-56 max-w-[78vw] rounded-2xl object-cover" />
                </button>
              ) : row.kind === "file" && row.body.startsWith("data:image") ? (
                <button type="button" onClick={() => setPreview(row.body)}>
                  <img src={row.body} alt="" className="max-h-56 rounded-2xl object-cover" />
                </button>
              ) : row.kind === "file" ? (
                <a href={row.body} download={row.fileName} className="underline">{row.fileName || "文件"}</a>
              ) : (
                <p className="w-fit whitespace-pre-wrap break-words">{row.body}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div
        className="fixed inset-x-0 z-40 mx-auto w-full max-w-md border-t border-line bg-paper"
        style={{ bottom }}
      >
        {showEmoji ? (
          <div className="grid grid-cols-8 gap-1 px-3 py-2">
            {EMOJIS.map((emo) => (
              <button
                key={emo}
                type="button"
                className="flex size-9 items-center justify-center text-xl"
                onClick={() => setText((t) => t + emo)}
              >
                {emo}
              </button>
            ))}
          </div>
        ) : null}
      <form
        className="flex items-center gap-2 px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send("text", text);
        }}
      >
        <label className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
          <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <ImagePlus className="size-4" />
        </label>
        <button type="button" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface" onClick={() => setShowEmoji((v) => !v)} aria-label="表情">
          <Smile className="size-4" />
        </button>
        <Input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="说点什么…" autoComplete="off" enterKeyHint="send" />
        <Button type="submit" size="sm" disabled={busy || !text.trim()}><Send className="size-4" /></Button>
      </form>
      </div>
      {preview ? (
        <button type="button" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4" onClick={() => setPreview("")}>
          <img src={preview} alt="" className="max-h-[88dvh] max-w-full rounded-lg object-contain" />
        </button>
      ) : null}
    </main>
  );
}

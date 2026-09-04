import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, CheckCheck, ImagePlus, Pencil, Reply, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/page-loading";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { editChatMessage, listChatMessages, sendChatMessage, type ChatMessage } from "@/lib/server/chat";
import { uploadMediaObject } from "@/lib/server/storage";
import { compressImage } from "@/lib/image";
import { formatChatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$id")({ component: ChatPage });

const EMOJIS = ["😊", "😂", "❤️", "👍", "🙏", "🔥", "✨", "🎉", "👋", "💪", "🤔", "😍", "😅", "🙌", "😎", "💯"];

function useFrameHeight() {
  const [frame, setFrame] = useState(() => {
    if (typeof window === "undefined") return { height: 0, top: 0 };
    const vv = window.visualViewport;
    return { height: vv?.height ?? window.innerHeight, top: vv?.offsetTop ?? 0 };
  });
  useEffect(() => {
    const apply = () => {
      const vv = window.visualViewport;
      setFrame({
        height: vv?.height ?? window.innerHeight,
        top: vv?.offsetTop ?? 0,
      });
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("focusin", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("focusin", apply);
    };
  }, []);
  return frame;
}

function ChatPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const frame = useFrameHeight();
  const [chatId, setChatId] = useState(id);
  const [title, setTitle] = useState("私信");
  const [rows, setRows] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [draft, setDraft] = useState<{ url: string; name: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await listChatMessages({ data: { chatId: id } });
        if (cancelled) return;
        setChatId(data.id);
        setTitle(data.title);
        setRows(data.messages);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        toast.error(err instanceof Error ? err.message : "私信打不开");
      }
    }
    void load();
    const tick = window.setInterval(() => {
      if (document.hidden) return;
      void load();
    }, 4000);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, id]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [rows, draft, replyTo, showEmoji, frame.height]);

  if (isPending) return <PageLoading label="打开私信" />;
  if (!user) return <RedirectToSignIn />;

  async function send(kind: ChatMessage["kind"], body: string, fileName = "") {
    if (!body.trim()) return;
    setBusy(true);
    try {
      if (editing && kind === "text") {
        await editChatMessage({ data: { chatId, messageId: editing.id, body } });
        setEditing(null);
      } else {
        const sent = await sendChatMessage({
          data: { chatId, kind, body, fileName, replyToId: replyTo?.id },
        });
        setChatId(sent.chatId);
      }
      setText("");
      setReplyTo(null);
      setDraft(null);
      const data = await listChatMessages({ data: { chatId } });
      setChatId(data.id);
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
        const compressed = await compressImage(file, { maxEdge: 1200, quality: 0.78, maxChars: 180_000 });
        setDraft({ url: compressed, name: file.name || "image.jpg" });
        setShowEmoji(false);
        return;
      }
      toast.error("现在只支持发图片");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "读取失败");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function sendDraft() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const stored = await uploadMediaObject({
        data: { dataUrl: draft.url, fileName: draft.name, kind: "chat-image" },
      });
      await send("image", stored.url, draft.name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
      setBusy(false);
    }
  }

  const lastMineId = [...(rows ?? [])].reverse().find((row) => row.mine)?.id;

  return (
    <main
      className="fixed inset-x-0 z-50 mx-auto flex w-full max-w-md flex-col overflow-hidden bg-paper"
      style={{ top: frame.top, height: frame.height ? `${frame.height}px` : "100dvh" }}
    >
      <header className="flex shrink-0 items-center gap-1 px-2 py-2">
        <Link to="/messages" className="flex size-11 items-center justify-center" aria-label="返回">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
      </header>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {rows === null ? <PageLoading label="加载消息" /> : null}
        {(rows ?? []).map((row) => (
          <div key={row.id} className={cn("flex", row.mine ? "justify-end" : "justify-start")}>
            <button
              type="button"
              className={cn("max-w-[78%] text-left", row.mine ? "items-end" : "items-start")}
              onClick={() => setMenu(row)}
            >
              {row.replyToId && row.replyPreview ? (
                <p className={cn("mb-1 line-clamp-2 rounded-md px-2 py-1 text-[11px] text-muted", row.mine ? "bg-lime/40" : "bg-paper-2")}>
                  {row.replyPreview}
                </p>
              ) : null}
              <div
                className={cn(
                  "rounded-2xl text-[15px] leading-snug",
                  row.kind === "image" ? "overflow-hidden bg-transparent p-0" : row.mine ? "bg-lime px-3 py-1.5" : "bg-surface px-3 py-1.5 shadow-card",
                )}
              >
                {row.kind === "image" ? (
                  <img
                    src={row.body}
                    alt=""
                    className="max-h-56 max-w-[70vw] rounded-2xl object-cover [outline:none]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview(row.body);
                    }}
                  />
                ) : (
                  <p className="w-fit whitespace-pre-wrap break-words">{row.body}</p>
                )}
              </div>
              <p className={cn("mt-0.5 flex items-center gap-1 text-[10px] text-muted", row.mine ? "justify-end" : "justify-start")}>
                <span>{formatChatTime(row.createdAt)}{row.editedAt ? " · 已编辑" : ""}</span>
                {row.mine && row.id === lastMineId ? (
                  row.read ? <CheckCheck className="size-3 text-ink" /> : <Check className="size-3" />
                ) : null}
              </p>
            </button>
          </div>
        ))}
        <div ref={end} />
      </div>

      {draft ? (
        <div className="shrink-0 border-t border-line bg-surface px-3 py-2">
          <div className="flex items-start gap-2">
            <img src={draft.url} alt="" className="h-20 w-20 rounded-lg object-cover [outline:none]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">发送这张图？</p>
              <p className="mt-0.5 truncate text-xs text-muted">{draft.name}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)}>取消</Button>
                <Button type="button" size="sm" disabled={busy} onClick={() => void sendDraft()}>
                  {busy ? "发送中…" : "发送"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {replyTo || editing ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-3 py-2 text-sm">
          {editing ? <Pencil className="size-4 text-muted" /> : <Reply className="size-4 text-muted" />}
          <p className="min-w-0 flex-1 truncate text-muted">
            {editing ? `编辑：${editing.body}` : `回复：${replyTo?.kind === "image" ? "[图片]" : replyTo?.body}`}
          </p>
          <button type="button" className="flex size-8 items-center justify-center" onClick={() => { setReplyTo(null); setEditing(null); }} aria-label="取消">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {showEmoji ? (
        <div className="grid shrink-0 grid-cols-8 gap-1 border-t border-line px-3 py-2">
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
        className="flex shrink-0 items-center gap-2 border-t border-line bg-paper px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          void send("text", text);
        }}
      >
        <label className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <ImagePlus className="size-4" />
        </label>
        <button type="button" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface" onClick={() => setShowEmoji((v) => !v)} aria-label="表情">
          <Smile className="size-4" />
        </button>
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={editing ? "改这句话…" : "说点什么…"}
          autoComplete="off"
          enterKeyHint="send"
        />
        <Button type="submit" size="sm" disabled={busy || !text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>

      {menu ? (
        <button type="button" className="fixed inset-0 z-50 flex items-end bg-ink/40" onClick={() => setMenu(null)}>
          <div className="w-full rounded-t-2xl bg-paper px-4 pb-8 pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <button
              type="button"
              className="flex h-12 w-full items-center gap-2 text-sm font-medium"
              onClick={() => {
                setReplyTo(menu);
                setEditing(null);
                setMenu(null);
                inputRef.current?.focus();
              }}
            >
              <Reply className="size-4" /> 回复
            </button>
            {menu.mine && menu.kind === "text" ? (
              <button
                type="button"
                className="flex h-12 w-full items-center gap-2 text-sm font-medium"
                onClick={() => {
                  setEditing(menu);
                  setReplyTo(null);
                  setText(menu.body);
                  setMenu(null);
                  inputRef.current?.focus();
                }}
              >
                <Pencil className="size-4" /> 编辑
              </button>
            ) : null}
            <button type="button" className="mt-1 h-11 w-full text-sm text-muted" onClick={() => setMenu(null)}>取消</button>
          </div>
        </button>
      ) : null}

      {preview ? (
        <button type="button" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4" onClick={() => setPreview("")}>
          <img src={preview} alt="" className="max-h-[88dvh] max-w-full rounded-lg object-contain [outline:none]" />
        </button>
      ) : null}
    </main>
  );
}

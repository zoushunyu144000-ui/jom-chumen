import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Camera, Check, CheckCheck, Image as ImageIcon, Pencil, Plus, Reply, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
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

function useVisualFrame() {
  const [frame, setFrame] = useState({ height: 0, top: 0, keyboard: false });
  useEffect(() => {
    const apply = () => {
      const vv = window.visualViewport;
      const inner = window.innerHeight;
      const height = vv?.height ?? inner;
      const top = vv?.offsetTop ?? 0;
      const overlap = Math.max(0, inner - height - top);
      setFrame({ height, top, keyboard: overlap > 60 });
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("focusin", apply);
    const onFocusOut = () => window.setTimeout(apply, 80);
    window.addEventListener("focusout", onFocusOut);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("focusin", apply);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  return frame;
}

function ChatPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const frame = useVisualFrame();
  const [chatId, setChatId] = useState(id);
  const [title, setTitle] = useState("私信");
  const [rows, setRows] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPlus, setShowPlus] = useState(false);
  const [draft, setDraft] = useState<{ url: string; name: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

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
  }, [rows, draft, replyTo, showEmoji, showPlus, frame.height]);

  function pinComposer() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.setTimeout(() => {
      window.scrollTo(0, 0);
      end.current?.scrollIntoView({ block: "end" });
    }, 250);
  }

  function resizeInput() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }

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
      if (inputRef.current) inputRef.current.style.height = "auto";
      const data = await listChatMessages({ data: { chatId } });
      setChatId(data.id);
      setRows(data.messages);
      inputRef.current?.focus();
      pinComposer();
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
        setShowPlus(false);
        return;
      }
      toast.error("现在只支持发图片");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "读取失败");
    } finally {
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
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
  const canSend = !busy && Boolean(text.trim());

  return (
    <main
      className="fixed inset-x-0 z-50 mx-auto flex w-full max-w-md flex-col overflow-hidden bg-paper"
      style={{
        top: frame.top,
        height: frame.height ? `${frame.height}px` : "100dvh",
      }}
    >
      <header className="glass-head flex shrink-0 items-center gap-1 px-2 py-2">
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
                  row.kind === "image"
                    ? "overflow-hidden bg-transparent p-0"
                    : row.mine
                      ? "bg-lime px-3 py-1.5"
                      : "bg-surface px-3 py-1.5 shadow-card",
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

      <div
        className="relative shrink-0 px-3 pt-1"
        style={{
          paddingBottom: frame.keyboard ? 8 : "max(10px, env(safe-area-inset-bottom))",
        }}
      >
        {draft ? (
          <div className="mb-2 flex items-start gap-2">
            <div className="relative">
              <img src={draft.url} alt="" className="h-[4.5rem] w-[4.5rem] rounded-2xl object-cover [outline:none]" />
              <button
                type="button"
                className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-surface"
                onClick={() => setDraft(null)}
                aria-label="去掉这张图"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm font-medium">发送这张图？</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendDraft()}
                className="mt-2 h-8 rounded-full bg-lime px-3 text-sm font-semibold text-ink disabled:opacity-40"
              >
                {busy ? "发送中…" : "发送"}
              </button>
            </div>
          </div>
        ) : null}

        {replyTo || editing ? (
          <div className="glass-sheet mb-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
            {editing ? <Pencil className="size-4 text-muted" /> : <Reply className="size-4 text-muted" />}
            <p className="min-w-0 flex-1 truncate text-muted">
              {editing ? `编辑：${editing.body}` : `回复：${replyTo?.kind === "image" ? "[图片]" : replyTo?.body}`}
            </p>
            <button
              type="button"
              className="flex size-8 items-center justify-center"
              onClick={() => { setReplyTo(null); setEditing(null); }}
              aria-label="取消"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        {showPlus ? (
          <div className="glass-sheet mb-2 w-52 overflow-hidden rounded-2xl">
            <button
              type="button"
              className="flex h-12 w-full items-center gap-3 px-3.5 text-sm font-medium"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-5" />
              拍照
            </button>
            <button
              type="button"
              className="flex h-12 w-full items-center gap-3 px-3.5 text-sm font-medium"
              onClick={() => galleryRef.current?.click()}
            >
              <ImageIcon className="size-5" />
              相册
            </button>
            <button
              type="button"
              className="flex h-12 w-full items-center gap-3 px-3.5 text-sm font-medium"
              onClick={() => {
                setShowPlus(false);
                setShowEmoji(true);
                inputRef.current?.blur();
              }}
            >
              <Smile className="size-5" />
              表情
            </button>
          </div>
        ) : null}

        {showEmoji ? (
          <div className="glass-sheet mb-2 grid grid-cols-8 gap-1 rounded-2xl px-2 py-2">
            {EMOJIS.map((emo) => (
              <button
                key={emo}
                type="button"
                className="flex size-9 items-center justify-center text-xl"
                onClick={() => {
                  setText((t) => t + emo);
                  requestAnimationFrame(resizeInput);
                }}
              >
                {emo}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="glass-composer flex items-end gap-1.5 rounded-full p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void send("text", text);
          }}
        >
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-2 text-ink"
            aria-label={showPlus ? "关闭" : "更多"}
            onClick={() => {
              setShowPlus((v) => !v);
              setShowEmoji(false);
              inputRef.current?.blur();
            }}
          >
            {showPlus ? <X className="size-5" /> : <Plus className="size-5" strokeWidth={2.4} />}
          </button>
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            autoCapitalize="sentences"
            placeholder={editing ? "改这句话…" : "说点什么…"}
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1.5 py-2 text-[15px] leading-snug text-ink outline-none placeholder:text-muted"
            onChange={(e) => {
              setText(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
            }}
            onFocus={() => {
              setShowPlus(false);
              setShowEmoji(false);
              pinComposer();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send("text", text);
              }
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime text-ink disabled:bg-paper-2 disabled:text-muted"
            aria-label="发送"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      {menu ? (
        <button type="button" className="fixed inset-0 z-50 flex items-end bg-ink/35" onClick={() => setMenu(null)}>
          <div className="glass-sheet w-full rounded-t-3xl px-4 pb-8 pt-3" onClick={(e) => e.stopPropagation()}>
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

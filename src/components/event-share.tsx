import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import type { EventRecord } from "@/lib/types";

export function EventShareButton({ event }: { event: Pick<EventRecord, "slug" | "title" | "price" | "currency" | "venue"> }) {
  const [busy, setBusy] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${event.slug}`
      : `https://jom-chumen-2026.vercel.app/events/${event.slug}`;
  const text = `${event.title} · ${formatPrice(event.price, event.currency)} · ${event.venue}`;

  async function share() {
    setBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("链接已复制，可以发到微信 / WhatsApp / IG");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("链接已复制");
      } catch {
        toast.error("复制失败，请长按地址栏");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      disabled={busy}
      className="flex size-11 items-center justify-center rounded-full bg-paper/90 text-ink shadow-card"
      aria-label="分享活动"
    >
      <Share2 className="size-5" />
    </button>
  );
}

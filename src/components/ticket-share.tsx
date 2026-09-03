import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice, formatRange } from "@/lib/format";
import type { TicketRecord } from "@/lib/types";

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lineH: number) {
  const words = text.split("");
  let line = "";
  let top = y;
  for (const ch of words) {
    const next = line + ch;
    if (ctx.measureText(next).width > max) {
      ctx.fillText(line, x, top);
      line = ch;
      top += lineH;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, top);
  return top;
}

async function drawCard(ticket: TicketRecord) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法生图");
  ctx.fillStyle = "#11110f";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#d8f56a";
  ctx.fillRect(0, 0, 1080, 18);
  ctx.fillStyle = "#d8f56a";
  ctx.font = "700 42px ui-sans-serif, system-ui";
  ctx.fillText("Jom 出门局", 80, 120);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "800 64px ui-sans-serif, system-ui";
  const afterTitle = wrap(ctx, ticket.event.title, 80, 230, 920, 78);
  ctx.fillStyle = "#c8c3b6";
  ctx.font = "400 36px ui-sans-serif, system-ui";
  ctx.fillText(formatRange(ticket.event.startsAt, ticket.event.endsAt, ticket.event.currency), 80, afterTitle + 80);
  ctx.fillText(ticket.event.venue, 80, afterTitle + 140);
  ctx.fillStyle = "#d8f56a";
  ctx.font = "700 40px ui-sans-serif, system-ui";
  ctx.fillText(`${ticket.nickname}  ·  ${ticket.seats} 人`, 80, 980);
  ctx.fillText(formatPrice(ticket.amount, ticket.currency), 80, 1040);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "500 28px ui-monospace, monospace";
  ctx.fillText(ticket.applyNo || ticket.code, 80, 1180);
  ctx.fillStyle = "#8b8678";
  ctx.font = "400 24px ui-sans-serif, system-ui";
  ctx.fillText("报名成功  ·  jom-chumen-2026.vercel.app", 80, 1260);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("生图失败"))), "image/jpeg", 0.92);
  });
}

export function TicketShareButton({ ticket }: { ticket: TicketRecord }) {
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const blob = await drawCard(ticket);
      const file = new File([blob], `${ticket.event.title}.jpg`, { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: ShareData) => Promise<void> };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: ticket.event.title, text: `我要去「${ticket.event.title}」` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        toast.success("图片已保存，可发朋友圈");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error(err instanceof Error ? err.message : "分享失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void share()}>
      {busy ? "生成图片…" : "生成朋友圈图片"}
    </Button>
  );
}

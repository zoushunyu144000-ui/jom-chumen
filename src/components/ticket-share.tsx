import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice, formatRange } from "@/lib/format";
import type { TicketRecord } from "@/lib/types";

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lineH: number) {
  let line = "";
  let top = y;
  for (const ch of text) {
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

async function loadCover(src: string) {
  if (!src || src.startsWith("data:image/svg")) return null;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src.startsWith("/") ? `${window.location.origin}${src}` : src;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

async function drawCard(ticket: TicketRecord) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1620;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法生图");
  ctx.fillStyle = "#efeae0";
  ctx.fillRect(0, 0, 1080, 1620);
  ctx.fillStyle = "#f7f3eb";
  ctx.fillRect(48, 48, 984, 1524);
  const cover = await loadCover(ticket.event.coverUrl);
  if (cover) {
    const h = 520;
    const scale = Math.max(984 / cover.width, h / cover.height);
    const w = cover.width * scale;
    const hh = cover.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(48, 48, 984, h);
    ctx.clip();
    ctx.drawImage(cover, 48 + (984 - w) / 2, 48 + (h - hh) / 2, w, hh);
    ctx.restore();
  } else {
    ctx.fillStyle = "#c6e14a";
    ctx.fillRect(48, 48, 984, 160);
  }
  ctx.fillStyle = "#141511";
  ctx.font = "700 36px ui-sans-serif, system-ui";
  ctx.fillText("Jom 出门局", 88, 640);
  ctx.font = "800 52px ui-sans-serif, system-ui";
  const after = wrap(ctx, ticket.event.title, 88, 720, 900, 64);
  ctx.fillStyle = "#5c574c";
  ctx.font = "400 30px ui-sans-serif, system-ui";
  ctx.fillText(formatRange(ticket.event.startsAt, ticket.event.endsAt, ticket.event.currency), 88, after + 56);
  ctx.fillText(ticket.event.venue, 88, after + 104);
  ctx.strokeStyle = "#d5cbb8";
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(88, 1180);
  ctx.lineTo(992, 1180);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#141511";
  ctx.font = "600 34px ui-sans-serif, system-ui";
  ctx.fillText(ticket.nickname, 88, 1260);
  ctx.fillText(`${ticket.seats} 人  ·  ${formatPrice(ticket.amount, ticket.currency)}`, 88, 1320);
  ctx.fillStyle = "#7a7468";
  ctx.font = "500 26px ui-monospace, monospace";
  ctx.fillText(ticket.applyNo || ticket.code, 88, 1400);
  ctx.fillText("报名成功", 88, 1460);
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
        toast.success("图片已保存");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error(err instanceof Error ? err.message : "分享失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void share()}>
      {busy ? "出图中…" : "转发这张票"}
    </Button>
  );
}

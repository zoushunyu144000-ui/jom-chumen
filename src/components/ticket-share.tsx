import { useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { TicketView } from "@/components/ticket-view";
import { Button } from "@/components/ui/button";
import { categoryName, cityName } from "@/lib/catalog";
import { formatPrice, formatRange, paymentLabel } from "@/lib/format";
import type { TicketRecord } from "@/lib/types";

const PAPER = "#f4f3ee";
const SURFACE = "#fffcf6";
const INK = "#141511";
const INK_SOFT = "#2b2c26";
const MUTED = "#6b6c64";
const LIME = "#c6e14a";
const LINE = "#d6d3c8";
const FONT = '"Noto Sans SC","PingFang SC","Hiragino Sans GB","Noto Sans",sans-serif';

async function loadCover(src: string) {
  if (!src || src.startsWith("data:image/svg")) return null;
  const url = src.startsWith("/") ? `${window.location.origin}${src}` : src;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/") || blob.type.includes("svg")) return null;
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number, font: string) {
  ctx.font = font;
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const next = line + ch;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = ch;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function drawQr(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number) {
  ctx.fillStyle = SURFACE;
  ctx.fillRect(x, y, size, size);
  if (!value) return;
  const dataUrl = await QRCode.toDataURL(value, {
    margin: 1,
    width: Math.round(size * 2),
    errorCorrectionLevel: "M",
    color: { dark: INK, light: SURFACE },
  });
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  ctx.drawImage(img, x, y, size, size);
}

export async function drawPaperTicket(ticket: TicketRecord) {
  const W = 1080;
  const outer = 36;
  const cardX = outer;
  const cardW = W - outer * 2;
  const limeH = 14;
  const coverH = 486;
  const pad = 56;
  const qrSize = 200;
  const titleFont = `800 52px ${FONT}`;
  const bodyFont = `400 30px ${FONT}`;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("无法生图");
  const titleLines = wrapLines(measure, ticket.event.title, cardW - pad * 2, titleFont).slice(0, 3);
  const venueLines = wrapLines(measure, ticket.event.venue, cardW - pad * 2, bodyFont).slice(0, 2);

  const cover = await loadCover(ticket.event.coverUrl);

  const coverTop = outer + limeH;
  const textX = cardX + pad;

  let y = coverTop + coverH + 58;
  const brandY = y;
  y += 40;
  const catY = y;
  y += 56;
  const titleTop = y;
  y += titleLines.length * 64;
  y += 20;
  const dateY = y;
  y += 48;
  const venueTop = y;
  y += venueLines.length * 42;
  y += 40;
  const dashY = y;
  y += 44;
  const stubTop = y;
  const stubH = 292;
  y += stubH + 36;
  const cardBottom = y;
  const H = cardBottom + outer;
  const cardH = cardBottom - outer;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法生图");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = SURFACE;
  roundRect(ctx, cardX, outer, cardW, cardH, 28);
  ctx.fill();

  ctx.save();
  roundRect(ctx, cardX, outer, cardW, cardH, 28);
  ctx.clip();
  ctx.fillStyle = LIME;
  ctx.fillRect(cardX, outer, cardW, limeH);

  if (cover) {
    const scale = Math.max(cardW / cover.width, coverH / cover.height);
    const w = cover.width * scale;
    const h = cover.height * scale;
    ctx.drawImage(cover, cardX + (cardW - w) / 2, coverTop + (coverH - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#e6e4dc";
    ctx.fillRect(cardX, coverTop, cardW, coverH);
    ctx.fillStyle = LIME;
    ctx.fillRect(cardX, coverTop + coverH - 10, cardW, 10);
    ctx.fillStyle = INK;
    ctx.font = `700 42px ${FONT}`;
    ctx.fillText("Jom 出门局", textX, coverTop + coverH / 2);
  }
  ctx.restore();

  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText("Jom 出门局", textX, brandY);

  ctx.fillStyle = LIME;
  ctx.font = `700 24px ${FONT}`;
  const badge = "报名成功";
  const badgeW = ctx.measureText(badge).width + 36;
  roundRect(ctx, cardX + cardW - pad - badgeW, brandY - 30, badgeW, 44, 22);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillText(badge, cardX + cardW - pad - badgeW + 18, brandY);

  ctx.fillStyle = MUTED;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(
    `${categoryName(ticket.event.category)} · ${cityName(ticket.event.city)}`,
    textX,
    catY,
  );

  ctx.fillStyle = INK;
  ctx.font = titleFont;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, textX, titleTop + i * 64);
  });

  ctx.fillStyle = INK_SOFT;
  ctx.font = bodyFont;
  ctx.fillText(
    formatRange(ticket.event.startsAt, ticket.event.endsAt, ticket.event.currency),
    textX,
    dateY,
  );
  venueLines.forEach((line, i) => {
    ctx.fillText(line, textX, venueTop + i * 42);
  });

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(textX, dashY);
  ctx.lineTo(cardX + cardW - pad, dashY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(cardX, dashY, 22, 0, Math.PI * 2);
  ctx.arc(cardX + cardW, dashY, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = MUTED;
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText("持票人", textX, stubTop + 28);
  ctx.fillStyle = INK;
  ctx.font = `700 36px ${FONT}`;
  ctx.fillText(ticket.nickname, textX, stubTop + 74);

  ctx.fillStyle = MUTED;
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText("人数 / 金额", textX, stubTop + 128);
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(
    `${ticket.seats} 人 · ${formatPrice(ticket.amount, ticket.currency)}`,
    textX,
    stubTop + 174,
  );

  ctx.fillStyle = MUTED;
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(`支付 · ${paymentLabel(ticket.paymentMethod)}`, textX, stubTop + 228);
  ctx.fillStyle = INK;
  ctx.font = `600 26px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(ticket.applyNo || ticket.code, textX, stubTop + 274);

  await drawQr(ctx, ticket.verifyUrl, cardX + cardW - pad - qrSize, stubTop + 36, qrSize);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("生图失败"))), "image/jpeg", 0.92);
  });
}

async function shareBlob(ticket: TicketRecord, blob: Blob) {
  const file = new File([blob], `${ticket.event.title}.jpg`, { type: "image/jpeg" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: ShareData) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: ticket.event.title, text: `我要去「${ticket.event.title}」` });
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  toast.success("图片已保存，可发朋友圈");
}

export function TicketShareButton({ ticket }: { ticket: TicketRecord }) {
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const blob = await drawPaperTicket(ticket);
      await shareBlob(ticket, blob);
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

export function ShareableTicket({ ticket }: { ticket: TicketRecord }) {
  return (
    <div className="space-y-2">
      <TicketView ticket={ticket} />
      <TicketShareButton ticket={ticket} />
    </div>
  );
}

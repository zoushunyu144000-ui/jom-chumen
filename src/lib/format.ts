import type { Currency, PaymentMethod } from "@/lib/types";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function formatPrice(price: number, currency: Currency) {
  if (price <= 0) return "免费";
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2);
  if (currency === "MYR") return `RM ${amount}`;
  if (currency === "SGD") return `S$${amount}`;
  return `฿${amount}`;
}

function zoneFor(currency?: Currency) {
  return currency === "THB" ? "Asia/Bangkok" : "Asia/Kuala_Lumpur";
}

function partsInZone(iso: string, timeZone: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = WEEKDAYS[weekdayMap[get("weekday")] ?? d.getUTCDay()] ?? "";
  return {
    month: String(Number(get("month"))),
    day: String(Number(get("day"))),
    weekday,
    hour: get("hour").padStart(2, "0"),
    minute: get("minute").padStart(2, "0"),
  };
}

export function formatWhen(iso: string, currency?: Currency) {
  const p = partsInZone(iso, zoneFor(currency));
  return `${p.month}月${p.day}日 ${p.weekday} ${p.hour}:${p.minute}`;
}

export function formatRange(startIso: string, endIso: string, currency?: Currency) {
  const zone = zoneFor(currency);
  const start = partsInZone(startIso, zone);
  const end = partsInZone(endIso, zone);
  const sameDay = start.month === end.month && start.day === end.day;
  const startLabel = `${start.month}月${start.day}日 ${start.weekday} ${start.hour}:${start.minute}`;
  if (sameDay) return `${startLabel} – ${end.hour}:${end.minute}`;
  return `${startLabel} – ${end.month}月${end.day}日 ${end.hour}:${end.minute}`;
}

export function formatLevel(level: "newbie" | "all" | "intermediate") {
  if (level === "newbie") return "零基础友好";
  if (level === "intermediate") return "有一定经验";
  return "不限水平";
}

export function paymentLabel(method: PaymentMethod | "free") {
  if (method === "wechat") return "微信";
  if (method === "alipay") return "支付宝";
  if (method === "tng") return "TNG";
  if (method === "cash") return "现金";
  if (method === "free") return "免费";
  return method;
}

export function applyStatusLabel(status: string) {
  if (status === "approved" || status === "paid") return "已成功";
  if (status === "rejected") return "已拒绝";
  if (status === "cancelled") return "已取消";
  return "待确认";
}

export function isApplySuccess(status: string) {
  return status === "approved" || status === "paid";
}

export function dayKey(iso: string, currency?: Currency) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zoneFor(currency),
  }).format(new Date(iso));
}

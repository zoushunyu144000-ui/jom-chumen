import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "****";
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

export function makeId(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `JOM-${out}`;
}

export function makeApplyNo(seq: number, now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
  }).format(now);
  return `HD-${day.replaceAll("-", "")}-${String(seq).padStart(3, "0")}`;
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function waLink(phone: string) {
  const digits = digitsOnly(phone);
  return digits ? `https://wa.me/${digits}` : "";
}

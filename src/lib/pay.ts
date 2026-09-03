export function isRealQr(src?: string | null) {
  if (!src) return false;
  const value = src.trim();
  if (!value) return false;
  if (value.endsWith(".svg")) return false;
  if (value.startsWith("/pay/")) return false;
  return (
    value.startsWith("data:image/") ||
    value.startsWith("/api/media/") ||
    value.startsWith("https://") ||
    value.startsWith("/covers/")
  );
}

export function isRealWhatsapp(num?: string | null) {
  const digits = String(num || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 20;
}

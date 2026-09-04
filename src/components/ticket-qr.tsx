import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function TicketQr({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!value) return;
    let alive = true;
    void QRCode.toDataURL(value, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: "M",
      color: { dark: "#121410", light: "#fffefa" },
    }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [value]);
  if (!src) return <div className={className} aria-hidden="true" />;
  return <img src={src} alt="入场二维码" className={className} />;
}

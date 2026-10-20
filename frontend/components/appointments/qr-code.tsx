"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Nội dung mã QR của một lịch hẹn. Bệnh viện quét hoặc dán mã này để check-in. */
export const apptPayload = (id: string) => `lifely:appt:${id}`;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/** Lấy mã lịch hẹn từ nội dung QR hoặc từ mã người dùng dán vào; trả về null nếu không hợp lệ. */
export const parseApptCode = (raw: string): string | null => raw.match(UUID_RE)?.[0] ?? null;

/** Vẽ mã QR (ảnh PNG) từ chuỗi. */
export function QrCode({ value, size = 208, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: "M" })
      .then((u) => { if (alive) setSrc(u); })
      .catch(() => { if (alive) setSrc(null); });
    return () => { alive = false; };
  }, [value, size]);
  // eslint-disable-next-line @next/next/no-img-element -- ảnh data: tạo tại chỗ, không cần tối ưu hóa
  return src ? <img src={src} alt={label} width={size} height={size} className="rounded-xl bg-white p-1" /> : <div style={{ width: size, height: size }} className="animate-pulse rounded-xl bg-muted" aria-busy="true" />;
}

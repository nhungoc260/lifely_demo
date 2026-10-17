"use client";

import { Loader2, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Place } from "@/lib/geocode";

/** Tìm địa điểm (OpenStreetMap, miễn phí, không cần khóa API) qua máy chủ của app; hiển thị rõ lý do khi không tìm được. */
export function MapSearch({ onFound }: { onFound: (lat: number, lng: number, label: string) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function search() {
    const term = q.trim();
    if (term.length < 2) { setMsg({ text: "Nhập ít nhất 2 ký tự.", ok: false }); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/geocode?q=${encodeURIComponent(term)}`, { headers: { Accept: "application/json" } });
      const data = (await res.json()) as { results?: Place[]; error?: string };
      if (!res.ok) setMsg({ text: data.error ?? "Hiện chưa tìm kiếm được. Hãy thử lại sau.", ok: false });
      else if (!data.results || data.results.length === 0) setMsg({ text: "Không tìm thấy địa điểm. Hãy thử tên khác, ví dụ “Quận 1, TP.HCM”.", ok: false });
      else {
        const p = data.results[0];
        onFound(p.lat, p.lng, p.label);
        setMsg({ text: `Đã di chuyển tới: ${p.label}`, ok: true });
      }
    } catch {
      setMsg({ text: "Không kết nối được. Kiểm tra mạng rồi thử lại.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Không dùng thẻ biểu mẫu ở đây: ô này nằm bên trong các biểu mẫu khác (hồ sơ, đăng ký, tạo yêu cầu). Biểu mẫu lồng nhau
          làm bấm "Tìm" hoặc nhấn Enter gửi luôn biểu mẫu bên ngoài (lưu hồ sơ, gửi yêu cầu máu...). */}
      <div role="search" className="flex gap-2">
        <Input
          aria-label="Tìm một địa điểm"
          placeholder="Tìm địa điểm, VD: Quận 1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}
        />
        <Button type="button" variant="outline" disabled={busy} aria-label="Tìm kiếm" onClick={() => void search()}>{busy ? <Loader2 className="animate-spin" /> : <Search />}</Button>
      </div>
      {msg && <p role="status" className={msg.ok ? "mt-1.5 line-clamp-2 text-xs text-muted-foreground" : "mt-1.5 text-xs text-destructive"}>{msg.text}</p>}
    </div>
  );
}

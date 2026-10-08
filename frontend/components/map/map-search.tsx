"use client";

import { Loader2, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Tìm địa điểm bằng Nominatim (OpenStreetMap), không cần API key. */
export function MapSearch({ onFound }: { onFound: (lat: number, lng: number, label: string) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (data.length === 0) setMsg("Không tìm thấy địa điểm. Hãy thử tên khác.");
      else onFound(Number(data[0].lat), Number(data[0].lon), data[0].display_name);
    } catch {
      setMsg("Hiện chưa tìm kiếm được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={search} role="search" className="flex gap-2">
      <Input aria-label="Tìm một địa điểm" placeholder="Tìm địa điểm, VD: Quận 1" value={q} onChange={(e) => setQ(e.target.value)} />
      <Button type="submit" variant="outline" disabled={busy} aria-label="Tìm kiếm">{busy ? <Loader2 className="animate-spin" /> : <Search />}</Button>
      {msg && <p role="status" className="sr-only">{msg}</p>}
    </form>
  );
}

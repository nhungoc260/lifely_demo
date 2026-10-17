"use client";

import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { MapContainerLazy } from "@/components/map/map-dynamic";
import { DEFAULT_CENTER } from "@/components/map/constants";
import { MapSearch } from "@/components/map/map-search";
import { BloodChip, UrgencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { locateUser } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { publicApi } from "@/services";
import { BLOOD_TYPES } from "@/types/domain";

export default function MapPage() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [bloodType, setBloodType] = useState("");
  const [urgency, setUrgency] = useState("");
  const [radius, setRadius] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const origin = me ?? center;
  const key = `map:${bloodType}:${urgency}:${radius}:${origin[0].toFixed(3)},${origin[1].toFixed(3)}`;
  const reqs = useQuery(key, () => publicApi.requests({ size: 50, bloodType: bloodType || undefined, urgency: urgency || undefined, radiusKm: radius ? Number(radius) : undefined, lat: origin[0], lng: origin[1] }));
  const orgs = useQuery("map-orgs", publicApi.organizations);

  // Vị trí người dùng luôn được làm tròn (~1 km) và vẽ như một khu vực gần đúng, không phải điểm chính xác.
  const approx = useMemo(() => (me ? { center: [Math.round(me[0] * 100) / 100, Math.round(me[1] * 100) / 100] as [number, number], km: 1 } : undefined), [me]);

  async function locate() {
    try {
      const p = await locateUser();
      setMe([p.lat, p.lng]);
      setCenter([p.lat, p.lng]);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Bản đồ khẩn cấp</h1>
        <p className="mt-1 text-sm text-muted-foreground">Các yêu cầu đang mở và bệnh viện đã xác minh. Vị trí người hiến máu không bao giờ được hiển thị.</p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1.4fr_repeat(3,1fr)_auto] md:items-end">
          <div><span className="mb-1.5 block text-sm font-medium">Tìm kiếm</span><MapSearch onFound={(lat, lng) => setCenter([lat, lng])} /></div>
          <Field label="Nhóm máu" htmlFor="f-bt"><Select id="f-bt" value={bloodType} onChange={(e) => setBloodType(e.target.value)}><option value="">Tất cả</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Mức độ khẩn cấp" htmlFor="f-urg"><Select id="f-urg" value={urgency} onChange={(e) => setUrgency(e.target.value)}><option value="">Tất cả</option><option value="CRITICAL">NGUY KỊCH</option><option value="URGENT">KHẨN</option><option value="NORMAL">BÌNH THƯỜNG</option></Select></Field>
          <Field label="Bán kính" htmlFor="f-rad"><Select id="f-rad" value={radius} onChange={(e) => setRadius(e.target.value)}><option value="">Bất kỳ</option><option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option></Select></Field>
          <Button variant="outline" onClick={locate}><LocateFixed /> Gần tôi</Button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="overflow-hidden rounded-[1.25rem] border border-border">
            <MapContainerLazy center={center} zoom={12} requests={reqs.data?.items ?? []} hospitals={orgs.data ?? []} approxArea={approx} radius={radius && approx ? { center: approx.center, km: Number(radius) } : undefined} onSelectRequest={setSelected} height={560} />
          </div>
          <aside aria-label="Danh sách yêu cầu" className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {reqs.initialLoading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)
              : reqs.error && !reqs.data ? <ErrorState message={reqs.error.message} onRetry={reqs.reload} />
              : reqs.data && reqs.data.items.length === 0 ? <EmptyState title="Không có yêu cầu phù hợp" description="Thử mở rộng bán kính hoặc bỏ bớt bộ lọc." />
              : reqs.data?.items.map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`} className={cn("block rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md", selected === r.id && "ring-2 ring-primary")}>
                  <div className="flex items-center justify-between"><UrgencyBadge urgency={r.urgency} /><BloodChip type={r.bloodType} /></div>
                  <p className="mt-3 font-medium">{r.unitsNeeded} đơn vị · {r.hospitalName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.distanceKm != null ? `Cách ${r.distanceKm.toFixed(1)} km ·` : ""}{r.unitsConfirmed}/{r.unitsRequired} đã xác nhận</p>
                </Link>
              ))}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

"use client";

import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { MapContainerLazy } from "@/components/map/map-dynamic";
import { DEFAULT_CENTER } from "@/components/map/constants";
import { MapSearch } from "@/components/map/map-search";
import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, UrgencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAppMode } from "@/hooks/use-app-mode";
import { useQuery } from "@/hooks/use-query";
import { locateUser } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { publicApi } from "@/services";
import { BLOOD_TYPES } from "@/types/domain";

function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Bản đồ khẩn cấp dùng chung: trang công khai /map và bên trong ứng dụng (giữ nguyên thanh tab). */
export function EmergencyMap({ embedded = false }: { embedded?: boolean }) {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [bloodType, setBloodType] = useState("");
  const [urgency, setUrgency] = useState("");
  const [radius, setRadius] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const dragY = useRef<number | null>(null);
  const appMode = useAppMode();
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia("(max-width: 767px)").matches, () => false);
  const mapH = narrow ? 400 : 560;

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

  if (appMode && embedded) {
    const items = reqs.data?.items ?? [];
    return (
      <div className="-mx-4">
        <div className="relative">
          <MapContainerLazy center={center} zoom={12} requests={reqs.data?.items ?? []} hospitals={orgs.data ?? []} approxArea={approx} radius={radius && approx ? { center: approx.center, km: Number(radius) } : undefined} onSelectRequest={setSelected} height={440} />
          <button type="button" onClick={locate} aria-label="Vị trí gần tôi" className="press absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-card shadow-lg"><LocateFixed className="size-5 text-primary" /></button>
        </div>
        <div className="relative z-10 -mt-6 rounded-t-3xl bg-surface px-4 pb-4 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,.12)]">
          <button type="button" onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen} aria-label={sheetOpen ? "Thu gọn danh sách" : "Mở rộng danh sách"}
            onTouchStart={(e) => { dragY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => { if (dragY.current === null) return; const dy = e.changedTouches[0].clientY - dragY.current; dragY.current = null; if (dy < -30) setSheetOpen(true); else if (dy > 30) setSheetOpen(false); }}
            className="mx-auto -mt-2 mb-1 flex h-8 w-full items-center justify-center"><span className="block h-1.5 w-12 rounded-full bg-border" /></button>
          <MapSearch onFound={(lat, lng) => setCenter([lat, lng])} />
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <select aria-label="Nhóm máu" className="h-9 shrink-0 rounded-full border border-border bg-card px-3 text-sm" value={bloodType} onChange={(e) => setBloodType(e.target.value)}><option value="">Nhóm máu</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</select>
            <select aria-label="Mức khẩn cấp" className="h-9 shrink-0 rounded-full border border-border bg-card px-3 text-sm" value={urgency} onChange={(e) => setUrgency(e.target.value)}><option value="">Khẩn cấp</option><option value="CRITICAL">NGUY KỊCH</option><option value="URGENT">KHẨN</option><option value="NORMAL">BÌNH THƯỜNG</option></select>
            <select aria-label="Bán kính" className="h-9 shrink-0 rounded-full border border-border bg-card px-3 text-sm" value={radius} onChange={(e) => setRadius(e.target.value)}><option value="">Bán kính</option><option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option><option value="50">50 km</option></select>
          </div>
          <p className="mb-2 mt-3 text-sm font-semibold">{reqs.data ? `${items.length} yêu cầu quanh đây` : "Đang tải…"}</p>
          <div className="space-y-3">
            {reqs.initialLoading ? <Skeleton className="h-24" />
              : reqs.error && !reqs.data ? <ErrorState message={reqs.error.message} onRetry={reqs.reload} />
              : items.length === 0 ? <EmptyState title="Không có yêu cầu phù hợp" description="Thử mở rộng bán kính hoặc bỏ bớt bộ lọc." />
              : (sheetOpen ? items : items.slice(0, 1)).map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`} className={cn("press block rounded-2xl border border-border bg-card p-4", selected === r.id && "ring-2 ring-primary")}>
                  <div className="flex items-center justify-between"><UrgencyBadge urgency={r.urgency} /><BloodChip type={r.bloodType} /></div>
                  <p className="mt-2 font-medium">{r.unitsNeeded} đơn vị · {r.hospitalName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.distanceKm != null ? `Cách ${r.distanceKm.toFixed(1)} km · ` : ""}{r.unitsConfirmed}/{r.unitsRequired} đã xác nhận</p>
                </Link>))}
            {!sheetOpen && items.length > 1 && <button type="button" onClick={() => setSheetOpen(true)} className="press w-full rounded-2xl bg-muted py-3 text-sm font-medium text-primary">Xem thêm {items.length - 1} yêu cầu</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
        {embedded ? <PageHeader title="Bản đồ khẩn cấp" description="Các yêu cầu đang mở và bệnh viện đã xác minh. Vị trí người hiến máu không bao giờ được hiển thị." /> : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">Bản đồ khẩn cấp</h1>
            <p className="mt-1 text-sm text-muted-foreground">Các yêu cầu đang mở và bệnh viện đã xác minh. Vị trí người hiến máu không bao giờ được hiển thị.</p>
          </>
        )}

        <div className={cn("grid grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-3 md:grid-cols-[1.4fr_repeat(3,1fr)_auto] md:items-end md:gap-4 md:p-4", !embedded && "mt-6")}>
          <div className="col-span-3 md:col-span-1"><span className="mb-1.5 block text-sm font-medium">Tìm kiếm</span><MapSearch onFound={(lat, lng) => setCenter([lat, lng])} /></div>
          <Field label="Nhóm máu" htmlFor="f-bt"><Select id="f-bt" value={bloodType} onChange={(e) => setBloodType(e.target.value)}><option value="">Tất cả</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Mức khẩn cấp" htmlFor="f-urg"><Select id="f-urg" value={urgency} onChange={(e) => setUrgency(e.target.value)}><option value="">Tất cả</option><option value="CRITICAL">NGUY KỊCH</option><option value="URGENT">KHẨN</option><option value="NORMAL">BÌNH THƯỜNG</option></Select></Field>
          <Field label="Bán kính" htmlFor="f-rad"><Select id="f-rad" value={radius} onChange={(e) => setRadius(e.target.value)}><option value="">Bất kỳ</option><option value="5">5 km</option><option value="10">10 km</option><option value="20">20 km</option></Select></Field>
          <Button variant="outline" className="col-span-3 md:col-span-1" onClick={locate}><LocateFixed /> Gần tôi</Button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="overflow-hidden rounded-[1.25rem] border border-border">
            <MapContainerLazy center={center} zoom={12} requests={reqs.data?.items ?? []} hospitals={orgs.data ?? []} approxArea={approx} radius={radius && approx ? { center: approx.center, km: Number(radius) } : undefined} onSelectRequest={setSelected} height={mapH} />
          </div>
          <aside aria-label="Danh sách yêu cầu" className="space-y-3 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1">
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
    </>
  );
}

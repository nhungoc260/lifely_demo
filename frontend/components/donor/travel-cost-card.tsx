"use client";

import { Bike, Car, Fuel, Navigation, Route, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  directionsUrl, estimateTravel, formatVnd, TRAVEL_COST, VEHICLE_PRESETS, type TravelGroup, type TravelOption,
} from "@/lib/travel-cost";

const ICON: Record<TravelGroup, typeof Bike> = { self: Fuel, bike: Bike, car: Car };

function Segmented<T extends string>({ value, onChange, items, label }: {
  value: T; onChange: (v: T) => void; items: { id: T; label: string }[]; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-muted p-0.5 text-xs">
      {items.map((it) => (
        <button
          key={it.id} type="button" role="radio" aria-checked={value === it.id} onClick={() => onChange(it.id)}
          className={cn("min-h-8 rounded-[10px] px-3 font-medium transition-colors", value === it.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >{it.label}</button>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="px-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p></div>;
}

/** Quãng đường, thời gian và chi phí tới bệnh viện: xe máy cá nhân so với GrabBike/beBike/Xanh SM và ô tô công nghệ. Chỉ để tham khảo. */
export function TravelCostCard({ distanceKm, hospitalName, district, city, supportVnd, parkingFee, bare, audience = "donor", noFacility }: {
  distanceKm: number; hospitalName: string; district?: string | null; city?: string | null;
  /** Mức hỗ trợ đi lại do cơ sở công bố (đồng). Bỏ trống = mức tối đa theo quy định, chưa phải cam kết của cơ sở này. */
  supportVnd?: number | null;
  /** Phí gửi xe máy do cơ sở công bố. Bỏ trống = giả định mặc định. */
  parkingFee?: number | null;
  /** true = không bọc Card (dùng trong khung mở rộng). */
  bare?: boolean;
  /** requester: người cần máu, chỉ xem quãng đường và cước. */
  audience?: "donor" | "requester";
  /** Yêu cầu của gia đình, không gắn cơ sở y tế: không có khoản hỗ trợ đi lại nào được ghi nhận. */
  noFacility?: boolean;
}) {
  const donor = audience === "donor";
  const [roundTrip, setRoundTrip] = useState(true);
  const [vehicle, setVehicle] = useState<"small" | "mid">("small");
  const preset = VEHICLE_PRESETS.find((p) => p.id === vehicle) ?? VEHICLE_PRESETS[0];
  const est = useMemo(
    () => estimateTravel({ straightKm: distanceKm, roundTrip, litersPer100Km: preset.litersPer100Km, supportVnd: noFacility ? 0 : supportVnd, parkingFee }),
    [distanceKm, roundTrip, preset.litersPer100Km, supportVnd, parkingFee, noFacility],
  );
  const sorted = useMemo(() => [...est.options].sort((a, b) => a.total - b.total), [est.options]);
  const maxTotal = Math.max(1, ...est.options.map((o) => o.total));
  const motor = est.options.find((o) => o.mode === "motorbike")!;

  return (
    <Wrapper bare={bare}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Route className="size-4 text-primary" aria-hidden />{donor ? "Đường tới bệnh viện" : "Từ bạn tới bệnh viện"}</CardTitle>
        <Segmented label="Số chiều" value={roundTrip ? "round" : "one"} onChange={(v) => setRoundTrip(v === "round")} items={[{ id: "one", label: "1 chiều" }, { id: "round", label: "Đi và về" }]} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 divide-x divide-border rounded-2xl bg-muted/50 py-3 text-center">
          <Stat label="Chim bay" value={`${est.straightKm.toFixed(1)} km`} />
          <Stat label="Đường đi" value={`~${est.roadKm.toFixed(1)} km`} />
          <Stat label="Thời gian" value={`~${Math.max(1, Math.round(est.minutes))} phút`} />
        </div>

        <ul className="divide-y divide-border">
          {sorted.map((o, i) => <OptionRow key={o.mode} o={o} legs={est.legs} best={i === 0} pct={(o.total / maxTotal) * 100} showSupport={donor && est.support > 0} />)}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"><Fuel className="size-3.5" aria-hidden />Xăng {formatVnd(TRAVEL_COST.fuelPricePerLiter)}/lít</span>
          <Segmented label="Loại xe máy" value={vehicle} onChange={setVehicle} items={[{ id: "small", label: "Vision" }, { id: "mid", label: "Air Blade" }]} />
        </div>

        {donor && (
          noFacility ? (
            <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">Yêu cầu của gia đình, không có hỗ trợ đi lại.</p>
          ) : supportVnd === 0 ? (
            <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">{hospitalName} không hỗ trợ đi lại.</p>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-success/10 px-4 py-3">
              <Wallet className="size-5 shrink-0 text-success" aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">Hỗ trợ đi lại tối đa {formatVnd(est.support)}</p>
                <p className="text-xs text-muted-foreground">{supportVnd == null ? "Mức thường áp dụng, cơ sở có thể khác" : `Do ${hospitalName} chi, tiền mặt`}</p>
              </div>
              <div className="text-right"><p className="text-[11px] text-muted-foreground">Xe máy, bạn tự chịu</p><p className="font-semibold tabular-nums">{formatVnd(motor.afterSupport)}</p></div>
            </div>
          )
        )}

        <a href={directionsUrl(hospitalName, district, city)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Navigation className="size-4" aria-hidden />Chỉ đường
        </a>

        <details className="group text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none font-medium hover:text-foreground">Cách tính</summary>
          <p className="mt-2 leading-relaxed">
            Ước tính tham khảo, giá thật hiển thị trên app lúc đặt xe. Cước Grab, Be, Xanh SM theo bảng giá TP.HCM đã công bố (gồm VAT, Xanh SM cập nhật cũ hơn), chưa gồm phụ phí giờ cao điểm, thời tiết, khuyến mãi.
            Xăng: mức tiêu hao hãng công bố nhân {TRAVEL_COST.cityFuelFactor} khi đi phố đông, giá {TRAVEL_COST.fuelPriceNote}. Gửi xe máy {formatVnd(est.parking)}{parkingFee != null ? " do cơ sở công bố" : " (giả định)"}.
          </p>
        </details>
      </CardContent>
    </Wrapper>
  );
}

function Wrapper({ bare, children }: { bare?: boolean; children: React.ReactNode }) {
  return bare ? <div>{children}</div> : <Card>{children}</Card>;
}

function OptionRow({ o, legs, best, pct, showSupport }: { o: TravelOption; legs: 1 | 2; best: boolean; pct: number; showSupport: boolean }) {
  const Icon = ICON[o.group];
  return (
    <li className="flex items-center gap-3 py-3">
      <span className={cn("grid size-10 shrink-0 place-content-center rounded-xl", best ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}><Icon className="size-[18px]" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{o.label}</span>
          {best && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">Rẻ nhất</span>}
        </p>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted" role="presentation"><span className={cn("block h-full rounded-full", best ? "bg-success" : "bg-primary/35")} style={{ width: `${Math.max(4, pct)}%` }} /></span>
      </div>
      <div className="text-right">
        <p className="text-base font-semibold tabular-nums">{formatVnd(o.total)}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {showSupport ? `sau hỗ trợ ${formatVnd(o.afterSupport)}` : legs === 2 && o.group !== "self" ? `${formatVnd(o.oneWay)}/chiều` : ""}
        </p>
      </div>
    </li>
  );
}

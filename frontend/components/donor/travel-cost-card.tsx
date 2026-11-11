"use client";

import { Bike, Car, Fuel, Navigation, Route, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  directionsUrl, estimateTravel, formatVnd, TRAVEL_COST, VEHICLE_PRESETS, type TravelGroup, type TravelOption,
} from "@/lib/travel-cost";

const ICON: Record<TravelGroup, typeof Bike> = { self: Fuel, bike: Bike, car: Car };
const GROUPS: { id: TravelGroup; title: string }[] = [
  { id: "self", title: "Tự đi" },
  { id: "bike", title: "Xe máy công nghệ" },
  { id: "car", title: "Ô tô công nghệ" },
];

function Segmented<T extends string>({ value, onChange, items, label }: {
  value: T; onChange: (v: T) => void; items: { id: T; label: string }[]; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-muted p-1 text-xs">
      {items.map((it) => (
        <button
          key={it.id} type="button" role="radio" aria-checked={value === it.id} onClick={() => onChange(it.id)}
          className={cn("min-h-9 rounded-lg px-3 py-1.5 font-medium transition-colors", value === it.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >{it.label}</button>
      ))}
    </div>
  );
}

/** Chi phí và thời gian đi tới nơi hiến máu: xe máy cá nhân (xăng + gửi xe) so với GrabBike / GrabCar. Chỉ để tham khảo. */
export function TravelCostCard({ distanceKm, hospitalName, district, city, supportVnd, parkingFee, bare, audience = "donor" }: {
  distanceKm: number; hospitalName: string; district?: string | null; city?: string | null;
  /** Mức hỗ trợ đi lại do cơ sở công bố (đồng). Bỏ trống = dùng mức tối đa theo quy định, chưa phải cam kết của cơ sở này. */
  supportVnd?: number | null;
  /** Phí gửi xe máy do cơ sở công bố. Bỏ trống = giả định mặc định. */
  parkingFee?: number | null;
  /** true = không bọc Card (dùng trong khung mở rộng). */
  bare?: boolean;
  /** requester: người cần máu, chỉ xem quãng đường và cước; không có hỗ trợ đi lại. */
  audience?: "donor" | "requester";
}) {
  const donor = audience === "donor";
  const [roundTrip, setRoundTrip] = useState(true);
  const [vehicle, setVehicle] = useState<"small" | "mid">("small");
  const preset = VEHICLE_PRESETS.find((p) => p.id === vehicle) ?? VEHICLE_PRESETS[0];
  const est = useMemo(
    () => estimateTravel({ straightKm: distanceKm, roundTrip, litersPer100Km: preset.litersPer100Km, supportVnd, parkingFee }),
    [distanceKm, roundTrip, preset.litersPer100Km, supportVnd, parkingFee],
  );
  const motor = est.options.find((o) => o.mode === "motorbike")!;
  const grabBike = est.options.find((o) => o.mode === "grabBike")!;
  const saving = grabBike.total - motor.total;

  return (
    <Wrapper bare={bare}>
      <CardHeader><CardTitle className="flex items-center gap-2"><Route className="size-4 text-primary" aria-hidden />{donor ? "Quãng đường và chi phí đi lại" : "Từ vị trí của bạn tới bệnh viện"}</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Đường chim bay</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">{est.straightKm.toFixed(1)} km</dd></div>
          <div className="rounded-xl bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Đường thực tế ước tính</dt><dd className="mt-0.5 text-lg font-semibold tabular-nums">~{est.roadKm.toFixed(1)} km <span className="text-xs font-normal text-muted-foreground">· ~{Math.max(1, Math.round(est.minutes))} phút</span></dd></div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Segmented label="Số chiều" value={roundTrip ? "round" : "one"} onChange={(v) => setRoundTrip(v === "round")} items={[{ id: "one", label: "Một chiều" }, { id: "round", label: "Đi và về" }]} />
          <Segmented label="Loại xe máy" value={vehicle} onChange={setVehicle} items={[{ id: "small", label: "Vision ~1,8 L/100km" }, { id: "mid", label: "Air Blade ~2,2 L/100km" }]} />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs">
          <Fuel className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p><strong>Giá xăng gần nhất: {formatVnd(TRAVEL_COST.fuelPricePerLiter)}/lít</strong> ({TRAVEL_COST.fuelPriceNote}; kiểm tra ngày {TRAVEL_COST.fuelPriceCheckedAt}). Giá xăng điều chỉnh theo kỳ, có thể đã đổi.</p>
        </div>

        {GROUPS.map((g) => {
          const rows = est.options.filter((o) => o.group === g.id);
          const Icon = ICON[g.id];
          return (
            <section key={g.id} className="mt-4" aria-label={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</h3>
              <ul className="divide-y divide-border">
                {rows.map((o) => <OptionRow key={o.mode} o={o} legs={est.legs} Icon={Icon} overall={o.mode === est.cheapest} showSupport={donor} />)}
              </ul>
            </section>
          );
        })}

        {!donor && (
          <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">Chi phí đi lại do gia đình tự chi. LIFELY không thu hay chi trả tiền, và không có tiền hay quà nào dành cho người tạo yêu cầu. Yêu cầu có dấu hiệu bất thường (nhiều tài khoản chung số điện thoại, tạo dồn dập...) sẽ bị hệ thống dừng ngay và admin xem xét.</p>
        )}
        {donor && <div className="mt-4 flex items-start gap-3 rounded-xl bg-success/10 p-4 text-sm">
          <Wallet className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Ai chi trả tiền đi lại?</p>
            {supportVnd === 0
              ? <p>Bạn tự trả. <strong>{hospitalName}</strong> hiện không công bố khoản hỗ trợ đi lại cho người hiến máu.</p>
              : supportVnd != null
                ? <p>Bạn tự trả trước. <strong>{hospitalName}</strong> công bố <strong>hỗ trợ tiền đi lại {formatVnd(supportVnd)}/lần hiến</strong> (tiền mặt, do cơ sở chi), cùng suất ăn nhẹ và quà tặng theo lượng máu hiến. Cột “sau hỗ trợ” là số tiền bạn thực tế tự chịu.</p>
                : <p>Bạn tự trả trước. Với hiến máu tình nguyện, cơ sở tiếp nhận máu thường <strong>hỗ trợ tiền đi lại tối đa {formatVnd(TRAVEL_COST.facilityTravelSupport)}/lần hiến</strong> (tiền mặt), cùng suất ăn nhẹ và quà tặng. Đây là mức tối đa theo quy định, chưa phải cam kết của cơ sở này. Cột “sau hỗ trợ” tính theo mức đó.</p>}
            <p className="text-xs text-muted-foreground">Yêu cầu máu khẩn cấp không đảm bảo khoản này: do cơ sở y tế quyết định, hãy hỏi nhân viên khi liên hệ. LIFELY không thu hay chi trả tiền; cơ sở ghi nhận khi đã chi.</p>
            {saving > 0 && <p>Đi xe máy của bạn rẻ hơn GrabBike khoảng <strong>{formatVnd(saving)}</strong> ({est.legs === 2 ? "đi và về" : "một chiều"}).</p>}
          </div>
        </div>}

        <a href={directionsUrl(hospitalName, district, city)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <Navigation className="size-4" aria-hidden />Chỉ đường tới {hospitalName}
        </a>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Chỉ là ước tính để bạn tham khảo, không phải giá chốt: giá thật hiển thị trên app lúc đặt xe. Cước Grab, Be, Xanh SM theo bảng giá TP.HCM đã công bố (đã gồm VAT), chưa tính phụ phí giờ cao điểm, thời tiết, khuyến mãi. Bảng giá Xanh SM cập nhật cũ hơn Grab và Be. Xăng tính theo mức mọi hãng xe công bố nhân thêm {TRAVEL_COST.cityFuelFactor} khi đi phố đông; {parkingFee != null ? `phí gửi xe máy ${formatVnd(parkingFee)} do cơ sở công bố.` : `phí gửi xe máy giả định ${formatVnd(TRAVEL_COST.motorbikeParking)}, mỗi bệnh viện có thể khác.`}
        </p>
      </CardContent>
    </Wrapper>
  );
}

function Wrapper({ bare, children }: { bare?: boolean; children: React.ReactNode }) {
  return bare ? <div>{children}</div> : <Card>{children}</Card>;
}

function OptionRow({ o, legs, Icon, overall, showSupport }: { o: TravelOption; legs: 1 | 2; Icon: typeof Bike; overall: boolean; showSupport: boolean }) {
  return (
    <li className="flex items-center gap-3 py-3 text-sm">
      <span className={cn("grid size-9 shrink-0 place-content-center rounded-xl", o.bestInGroup ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}><Icon className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{o.label}
          {overall ? <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">Rẻ nhất</span>
            : o.bestInGroup && o.group !== "self" ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Rẻ nhất nhóm</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">{o.note}{legs === 2 && o.group !== "self" ? ` · ${formatVnd(o.oneWay)} mỗi chiều` : ""}</p>
      </div>
      <div className="text-right">
        <p className="text-base font-semibold tabular-nums">{formatVnd(o.total)}</p>
        {showSupport && <p className="text-[11px] text-muted-foreground tabular-nums">sau hỗ trợ: {o.afterSupport === 0 ? "0đ" : formatVnd(o.afterSupport)}</p>}
      </div>
    </li>
  );
}

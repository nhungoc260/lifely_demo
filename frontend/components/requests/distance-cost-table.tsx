"use client";

import { Bike, Car, Fuel } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { formatVnd, referenceRows, TRAVEL_COST } from "@/lib/travel-cost";

const KMS = [3, 5, 10, 15, 20];

/** So sánh một chiều theo quãng đường: tiền xăng xe máy với GrabBike, beBike, Xanh SM Bike, GrabCar, beCar, Xanh SM Car. Dạng danh sách để dùng tốt trên điện thoại. */
export function DistanceCostTable() {
  const [km, setKm] = useState(5);
  const rows = useMemo(() => {
    const r = referenceRows([km])[0];
    return [
      { key: "fuel", label: "Xe máy của bạn", sub: "Tiền xăng", price: r.fuel, Icon: Fuel },
      { key: "grabBike", label: "GrabBike", price: r.grabBike, Icon: Bike },
      { key: "beBike", label: "beBike", price: r.beBike, Icon: Bike },
      { key: "greenBike", label: "Xanh SM Bike", price: r.greenBike, Icon: Bike },
      { key: "grabCar", label: "GrabCar 4 chỗ", price: r.grabCar, Icon: Car },
      { key: "beCar", label: "beCar 4 chỗ", price: r.beCar, Icon: Car },
      { key: "greenCar", label: "Xanh SM Car", price: r.greenCar, Icon: Car },
    ].sort((a, b) => a.price - b.price);
  }, [km]);
  const max = Math.max(1, ...rows.map((r) => r.price));

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Quãng đường" className="flex gap-2 overflow-x-auto pb-1">
          {KMS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={km === k} onClick={() => setKm(k)}
              className={cn("min-h-9 shrink-0 rounded-full border px-4 text-sm font-medium", km === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>{k} km</button>
          ))}
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex"><Fuel className="size-3.5" aria-hidden />Xăng {formatVnd(TRAVEL_COST.fuelPricePerLiter)}/lít</span>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-3 py-3">
            <span className={cn("grid size-10 shrink-0 place-content-center rounded-xl", i === 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}><r.Icon className="size-[18px]" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="truncate">{r.label}</span>
                {i === 0 && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">Rẻ nhất</span>}
              </p>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted" role="presentation"><span className={cn("block h-full rounded-full", i === 0 ? "bg-success" : "bg-primary/35")} style={{ width: `${Math.max(4, (r.price / max) * 100)}%` }} /></span>
            </div>
            <p className="text-base font-semibold tabular-nums">{formatVnd(r.price)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">Một chiều, ước tính tham khảo. Xăng {formatVnd(TRAVEL_COST.fuelPricePerLiter)}/lít.</p>
    </div>
  );
}

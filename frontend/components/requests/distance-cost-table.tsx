import { Fuel } from "lucide-react";

import { formatVnd, referenceRows, TRAVEL_COST, VEHICLE_PRESETS } from "@/lib/travel-cost";

const KMS = [3, 5, 10, 15, 20];

/** Bảng so sánh một chiều theo quãng đường: tiền xăng xe máy với GrabBike, beBike, Xanh SM Bike, GrabCar, beCar, Xanh SM Car. */
export function DistanceCostTable() {
  const rows = referenceRows(KMS);
  const th = "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-muted-foreground";
  const td = "whitespace-nowrap px-3 py-2 tabular-nums";
  return (
    <div>
      <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs">
        <Fuel className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p><strong>Giá xăng gần nhất: {formatVnd(TRAVEL_COST.fuelPricePerLiter)}/lít</strong> ({TRAVEL_COST.fuelPriceNote}; kiểm tra ngày {TRAVEL_COST.fuelPriceCheckedAt}). Xe máy {VEHICLE_PRESETS[0].litersPer100Km} L/100 km theo hãng công bố, nhân {TRAVEL_COST.cityFuelFactor} khi đi phố đông.</p>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Chi phí một chiều theo quãng đường đường thực tế</caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className={th}>Quãng đường</th>
              <th scope="col" className={th}>Xe máy (xăng)</th>
              <th scope="col" className={th}>GrabBike</th>
              <th scope="col" className={th}>beBike</th>
              <th scope="col" className={th}>Xanh SM Bike</th>
              <th scope="col" className={th}>GrabCar</th>
              <th scope="col" className={th}>beCar</th>
              <th scope="col" className={th}>Xanh SM Car</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.roadKm}>
                <th scope="row" className={`${td} text-left font-medium`}>{r.roadKm} km</th>
                <td className={`${td} font-semibold text-success`}>{formatVnd(r.fuel)}</td>
                <td className={td}>{formatVnd(r.grabBike)}</td>
                <td className={td}>{formatVnd(r.beBike)}</td>
                <td className={td}>{formatVnd(r.greenBike)}</td>
                <td className={td}>{formatVnd(r.grabCar)}</td>
                <td className={td}>{formatVnd(r.beCar)}</td>
                <td className={td}>{formatVnd(r.greenCar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Một chiều, quãng đường đường thực tế. Cước Grab, Be, Xanh SM đã gồm VAT, chưa tính phụ phí giờ cao điểm, thời tiết, khuyến mãi. Tiền xăng chưa gồm phí gửi xe. Chỉ để tham khảo, không phải giá chốt.</p>
    </div>
  );
}

"use client";

import { useQuery } from "@/hooks/use-query";
import { TRAVEL_COST } from "@/lib/travel-cost";
import { fuelApi } from "@/services";

export interface FuelInfo {
  /** Đồng/lít; dùng giá dự phòng khi chưa tải được. */
  price: number;
  effectiveDate: string | null;
  label: string;
  /** Đã lâu admin chưa cập nhật: hiện cảnh báo. */
  stale: boolean;
  loaded: boolean;
}

/** Giá xăng hiện hành (đổi theo ngày, admin cập nhật). Lỗi mạng thì rơi về giá dự phòng để thẻ chi phí vẫn hiện được. */
export function useFuelPrice(): FuelInfo {
  const q = useQuery("fuel-price", fuelApi.current);
  const d = q.data;
  return {
    price: d?.priceVnd ?? TRAVEL_COST.fuelPricePerLiter,
    effectiveDate: d?.effectiveDate ?? null,
    label: d?.label ?? TRAVEL_COST.fuelLabel,
    stale: d?.stale ?? false,
    loaded: !!d,
  };
}

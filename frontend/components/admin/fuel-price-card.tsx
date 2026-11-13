"use client";

import { Fuel, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatVnd, shortDay } from "@/lib/travel-cost";
import { adminApi, fuelApi } from "@/services";

/** Theo dõi giá xăng: hệ thống tự lấy từ các trang công bố nhiều lần mỗi ngày, admin chỉ xem trạng thái (không nhập tay). */
export function FuelPriceCard() {
  const cur = useQuery("admin-fuel-current", fuelApi.current);
  const hist = useQuery("admin-fuel-history", () => adminApi.fuelPrices(7));
  const [fetching, setFetching] = useState(false);

  async function refresh() {
    setFetching(true);
    try {
      const r = await adminApi.fetchFuelPriceNow();
      (r.ok ? toast.success : toast.error)(r.message);
      cur.reload();
      hist.reload();
    } catch (e) { toast.error(toApiError(e).message); }
    finally { setFetching(false); }
  }

  const c = cur.data;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Fuel className="size-4 text-primary" aria-hidden />Giá xăng tự động</CardTitle>
        {c && (c.stale ? <Pill t="amber">{c.ageDays} ngày chưa lấy được giá mới</Pill> : <Pill t="green">Cập nhật {shortDay(c.effectiveDate)}</Pill>)}
      </CardHeader>
      <CardContent className="space-y-3">
        {cur.initialLoading ? <Skeleton className="h-16" /> : c && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tabular-nums">{formatVnd(c.priceVnd)}<span className="text-base font-medium text-muted-foreground">/lít</span></p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              {c.source && <p className="text-xs text-muted-foreground">{c.source}</p>}
            </div>
            {hist.data && hist.data.length > 1 && (
              <ul className="flex gap-2 overflow-x-auto text-xs" aria-label="Lịch sử giá xăng">
                {hist.data.slice().reverse().map((h) => (
                  <li key={h.id} className="shrink-0 rounded-xl bg-muted px-3 py-1.5 text-center"><p className="text-muted-foreground">{shortDay(h.effectiveDate)}</p><p className="font-semibold tabular-nums">{h.priceVnd.toLocaleString("vi-VN")}</p></li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Tự cập nhật 4 lần mỗi ngày, đối chiếu nhiều nguồn.</span>
          <Button size="sm" variant="outline" disabled={fetching} onClick={refresh}>{fetching ? <Loader2 className="animate-spin" /> : <RefreshCw />} Làm mới ngay</Button>
        </div>
      </CardContent>
    </Card>
  );
}

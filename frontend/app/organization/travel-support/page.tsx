"use client";

import { HandCoins, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { TravelSupportSummary } from "@/components/organization/travel-support-summary";
import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/travel-cost";
import { cn } from "@/lib/utils";
import { appointmentApi, orgApi, requestApi } from "@/services";
import type { TravelSupportItem } from "@/types/domain";

const TABS = [
  { id: "UNPAID", label: "Cần ghi nhận" }, { id: "PAID", label: "Đã ghi nhận" }, { id: "ALL", label: "Tất cả" },
] as const;

const KIND_LABEL = { APPOINTMENT: "Lịch hiến", URGENT: "Yêu cầu khẩn cấp" } as const;

export default function OrgTravelSupport() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("UNPAID");
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery(`org-ts-items-${tab}`, () => orgApi.travelSupportItems(tab));

  async function pay(it: TravelSupportItem) {
    setBusy(it.id);
    try {
      if (it.kind === "URGENT") await requestApi.payTravelSupport(it.id);
      else await appointmentApi.payTravelSupport(it.id);
      toast.success("Đã ghi nhận hỗ trợ đi lại. Người hiến được thông báo.");
      setTick((t) => t + 1);
      q.reload();
    } catch (e) { toast.error(toApiError(e).message); q.reload(); }
    finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="Hỗ trợ đi lại" description="Mọi lượt hiến đã xác nhận của cơ sở, gồm lịch hiến đặt trước và yêu cầu máu khẩn cấp. Sau khi chi tiền mặt cho người hiến, bấm ghi nhận để người hiến và admin đối chiếu. LIFELY không thu hay chuyển tiền." />
      <TravelSupportSummary key={tick} onStats />

      <div role="tablist" aria-label="Lọc theo trạng thái" className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("min-h-10 rounded-full border px-4 text-sm font-medium", tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>{t.label}</button>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Danh sách lượt hiến</CardTitle></CardHeader>
        <CardContent>
          {q.initialLoading ? <Skeleton className="h-40" />
            : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
            : !q.data || q.data.length === 0 ? <EmptyState title={tab === "UNPAID" ? "Không còn lượt nào cần ghi nhận" : "Chưa có lượt hiến nào"} description="Lượt hiến xuất hiện ở đây sau khi bạn xác nhận người hiến đã hiến." />
            : (
              <ul className="divide-y divide-border">
                {q.data.map((it) => (
                  <li key={`${it.kind}-${it.id}`} className="flex flex-wrap items-center gap-3 py-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {it.donorName}{it.bloodType && <Pill t="slate">{it.bloodType}</Pill>}
                        <Pill t={it.kind === "URGENT" ? "red" : "slate"}>{KIND_LABEL[it.kind]}</Pill>
                      </p>
                      <p className="text-xs text-muted-foreground">{it.place}{it.donatedAt ? ` · hiến ${formatDateTime(it.donatedAt)}` : ""}</p>
                    </div>
                    {it.paidVnd != null ? (
                      <p className="text-sm font-medium text-success">Đã ghi nhận {formatVnd(it.paidVnd)}</p>
                    ) : it.policyVnd > 0 ? (
                      <Button size="sm" disabled={busy !== null} onClick={() => pay(it)}>
                        {busy === it.id ? <Loader2 className="animate-spin" /> : <HandCoins />} Đã chi {formatVnd(it.policyVnd)}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Chưa công bố mức hỗ trợ. Cập nhật ở <Link href="/organization/profile" className="font-medium text-primary underline">Hồ sơ tổ chức</Link>.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>
    </>
  );
}

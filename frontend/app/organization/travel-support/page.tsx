"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { TravelSupportSummary } from "@/components/organization/travel-support-summary";
import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatVnd, suggestSupport } from "@/lib/travel-cost";
import { cn } from "@/lib/utils";
import { appointmentApi, orgApi, requestApi } from "@/services";
import type { TravelSupportItem } from "@/types/domain";

const TABS = [
  { id: "UNPAID", label: "Cần ghi nhận" }, { id: "PAID", label: "Đã ghi nhận" }, { id: "ALL", label: "Tất cả" },
] as const;

function Row({ it, busy, onPay }: { it: TravelSupportItem; busy: boolean; onPay: (it: TravelSupportItem, amount: number) => void }) {
  const sug = suggestSupport(it.distanceKm, it.policyVnd);
  const [amount, setAmount] = useState(String(sug.suggested));
  const n = Number(amount);
  const valid = Number.isInteger(n) && n >= 1000 && n <= Math.max(it.policyVnd, 1000);

  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <span className="grid size-11 shrink-0 place-content-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">{it.bloodType ?? "?"}</span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {it.donorName}
          <Pill t={it.kind === "URGENT" ? "red" : "slate"}>{it.kind === "URGENT" ? "Khẩn cấp" : "Lịch hiến"}</Pill>
        </p>
        <p className="truncate text-xs text-muted-foreground">{it.place}{it.donatedAt ? ` · ${formatDateTime(it.donatedAt)}` : ""}</p>
        {it.distanceKm != null && it.paidVnd == null && it.policyVnd > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">Nhà cách cơ sở ~{it.distanceKm.toFixed(1)} km · đi và về khoảng {formatVnd(sug.grabBikeRoundTrip)} (GrabBike)</p>
        )}
      </div>
      {it.paidVnd != null ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-success"><Check className="size-4" aria-hidden />{formatVnd(it.paidVnd)}</p>
      ) : it.policyVnd > 0 ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`amt-${it.id}`}>Số tiền đã chi</label>
          <div className="flex h-10 items-center rounded-xl border border-border bg-background pr-3 focus-within:ring-2 focus-within:ring-ring">
            <input id={`amt-${it.id}`} type="number" inputMode="numeric" min={1000} max={it.policyVnd} step={1000} value={amount}
              onChange={(e) => setAmount(e.target.value)} className="w-24 bg-transparent px-3 text-right text-sm font-semibold tabular-nums outline-none" />
            <span className="text-sm text-muted-foreground">đ</span>
          </div>
          <Button size="sm" disabled={busy || !valid} onClick={() => onPay(it, n)}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />} Ghi nhận
          </Button>
        </div>
      ) : (
        <Link href="/organization/profile" className="text-xs font-medium text-primary underline">Đặt mức hỗ trợ</Link>
      )}
    </li>
  );
}

export default function OrgTravelSupport() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("UNPAID");
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery(`org-ts-items-${tab}`, () => orgApi.travelSupportItems(tab));

  async function pay(it: TravelSupportItem, amount: number) {
    setBusy(it.id);
    try {
      if (it.kind === "URGENT") await requestApi.payTravelSupport(it.id, amount);
      else await appointmentApi.payTravelSupport(it.id, amount);
      toast.success(`Đã ghi nhận ${formatVnd(amount)} cho ${it.donorName}`);
      setTick((t) => t + 1);
      q.reload();
    } catch (e) { toast.error(toApiError(e).message); q.reload(); }
    finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="Hỗ trợ đi lại" description="Ghi nhận tiền đi lại đã chi cho người hiến, cả lịch đặt trước và yêu cầu khẩn cấp." />
      <TravelSupportSummary key={tick} onStats />

      <div role="tablist" aria-label="Lọc" className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium", tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>{t.label}</button>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="pt-2">
          {q.initialLoading ? <Skeleton className="mt-4 h-40" />
            : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
            : !q.data || q.data.length === 0 ? <EmptyState title={tab === "UNPAID" ? "Không còn lượt nào cần ghi nhận" : "Chưa có lượt hiến nào"} />
            : <ul className="divide-y divide-border">{q.data.map((it) => <Row key={`${it.kind}-${it.id}`} it={it} busy={busy === it.id} onPay={pay} />)}</ul>}
        </CardContent>
      </Card>
    </>
  );
}

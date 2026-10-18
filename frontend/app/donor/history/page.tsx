"use client";

import { BadgeCheck, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { ListGroup } from "@/components/ui/mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationBadge } from "@/components/donor/verification-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { donorApi } from "@/services";

export default function DonorHistory() {
  const q = useQuery("donor-history", donorApi.history);
  const v = useQuery("donor-verification", donorApi.verification);
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    try {
      await donorApi.addDonation({ donatedOn: date, location: location.trim() || undefined });
      toast.success("Đã ghi nhận lần hiến máu");
      setDate(""); setLocation("");
      q.reload();
    } catch (err) { toast.error(toApiError(err).message); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Lịch sử hiến máu" description="Các lần hiến được xác nhận qua LIFELY sẽ tự động thêm vào. Bạn cũng có thể ghi lại các lần hiến trước đó." />
      {v.data && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/60 md:mb-6">
          <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${v.data.facilityVerified ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/12 text-slate-600 dark:text-slate-300"}`}><BadgeCheck className="size-[18px]" aria-hidden /></span>
          <div className="min-w-0 text-sm">
            {v.data.facilityVerified ? (
              <p className="font-semibold">
                {v.data.facilityVerifiedDonations} lần hiến được cơ sở y tế xác nhận
                {v.data.verifiedByName ? ` (gần nhất: ${v.data.verifiedByName})` : ""}
              </p>
            ) : (
              <p className="font-semibold">Chưa có lần hiến nào được cơ sở y tế xác nhận</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">Người cần máu thấy huy hiệu này. Thông tin tự khai báo chỉ để tham khảo; điều kiện hiến máu do cơ sở y tế xác định.</p>
          </div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {q.initialLoading ? <Skeleton className="h-64" />
            : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
            : q.data && q.data.length === 0 ? <EmptyState title="Chưa ghi nhận lần hiến máu nào" description="Các lần hiến máu của bạn sẽ hiện ở đây theo dòng thời gian." />
            : (
              <>
                <ListGroup className="md:hidden">
                  {q.data?.map((d) => {
                    const dt = new Date(d.donatedOn);
                    return (
                      <div key={d.id} className="flex items-center gap-3 px-4 py-3.5">
                        <span className="grid size-12 shrink-0 place-content-center rounded-2xl bg-rose-500/10 text-center text-rose-600 dark:text-rose-400">
                          <span className="text-lg font-bold leading-none tabular-nums">{String(dt.getUTCDate()).padStart(2, "0")}</span>
                          <span className="mt-0.5 text-[10px] font-semibold uppercase">Th{dt.getUTCMonth() + 1}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold">{d.location ?? "Chưa cung cấp địa điểm"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(d.donatedOn)}{d.source === "LIFELY_MATCH" ? " · Qua LIFELY" : ""}</p>
                          <div className="mt-1"><VerificationBadge level={d.verificationLevel} by={d.confirmedByOrganization} /></div>
                        </div>
                      </div>
                    );
                  })}
                </ListGroup>
              <ol className="relative hidden md:block space-y-6 border-l border-border pl-6">
                {q.data?.map((d) => (
                  <li key={d.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-card bg-primary ring-1 ring-primary/40" aria-hidden />
                    <time dateTime={d.donatedOn} className="text-sm font-semibold">{formatDate(d.donatedOn)}</time>
                    <p className="text-sm">Đã ghi nhận lần hiến máu</p>
                    <p className="text-xs text-muted-foreground">{d.location ?? "Chưa cung cấp địa điểm"}{d.source === "LIFELY_MATCH" ? " · Qua LIFELY" : ""}</p>
                    <div className="mt-1"><VerificationBadge level={d.verificationLevel} by={d.confirmedByOrganization} /></div>
                  </li>
                ))}
              </ol>
              </>
            )}
        </div>
        <Card>
          <CardContent>
            <h2 className="mb-4 font-bold md:font-semibold">Ghi lại một lần hiến máu</h2>
            <form onSubmit={add} className="space-y-4">
              <Field label="Ngày" htmlFor="d-date"><Input id="d-date" type="date" required max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Nơi hiến (không bắt buộc)" htmlFor="d-loc"><Input id="d-loc" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
              <Button type="submit" className="w-full" disabled={busy || !date}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} Thêm lần hiến</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

"use client";

import { CheckCircle2, ChevronLeft, Circle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { VerificationBadge } from "@/components/donor/verification-badge";
import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { donorApi } from "@/services";

/** Chi tiết một lần hiến máu và các mốc đã ghi nhận. Chỉ hiển thị những gì hệ thống thật sự lưu (ngày hiến, nơi hiến, nguồn, mức xác nhận). */
export default function DonationDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery("donor-history", donorApi.history);
  const d = q.data?.find((x) => x.id === id);
  const journey = useQuery(d ? `donor-journey:${id}` : null, () => donorApi.donationJourney(id));
  const confirmed = d?.verificationLevel === "ORG_VERIFIED" || d?.verificationLevel === "REQUESTER_CONFIRMED";

  const steps = d ? [
    { done: true, title: "Hiến máu", line: formatDate(d.donatedOn), sub: d.location ?? "Chưa cung cấp địa điểm" },
    { done: d.source === "LIFELY_MATCH", title: "Kết nối qua LIFELY", line: d.source === "LIFELY_MATCH" ? "Bạn đã nhận lời một yêu cầu trên LIFELY" : "Tự ghi lại, không qua yêu cầu LIFELY", sub: undefined },
    { done: confirmed, title: "Xác nhận", line: d.verificationLevel === "ORG_VERIFIED" ? `Cơ sở y tế xác nhận${d.confirmedByOrganization ? `: ${d.confirmedByOrganization}` : ""}` : d.verificationLevel === "REQUESTER_CONFIRMED" ? "Người nhà bệnh nhân xác nhận" : "Chưa được xác nhận", sub: undefined },
    ...(journey.data ? [{ done: journey.data.addedToInventory, title: "Nhập kho",
      line: journey.data.addedToInventory ? `Đã nhập kho${journey.data.organizationName ? ` của ${journey.data.organizationName}` : ""}${journey.data.addedAt ? ` ngày ${formatDate(journey.data.addedAt)}` : ""}` : "Chưa nhập kho (cơ sở chưa xác nhận hoặc không bật tự động cộng kho)", sub: undefined as string | undefined }] : []),
  ] : [];

  return (
    <>
      <Link href="/donor/history" className="press mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary"><ChevronLeft className="size-4" aria-hidden />Lịch sử hiến máu</Link>
      <PageHeader title="Chi tiết lần hiến" />
      {q.initialLoading ? <Skeleton className="h-56" /> : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : !d ? <EmptyState title="Không tìm thấy lần hiến này" description="Có thể bản ghi đã bị xóa." />
        : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4">
              <dl className="space-y-3 text-sm">
                {([["Ngày hiến", formatDate(d.donatedOn)], ["Địa điểm", d.location ?? "Chưa cung cấp"], ["Nguồn", d.source === "LIFELY_MATCH" ? "Qua LIFELY" : "Tự khai báo"]] as const).map(([k, v]) => (
                  <div key={k} className="flex gap-4"><dt className="w-28 shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 flex-1 font-medium">{v}</dd></div>
                ))}
                <div className="flex items-center gap-4"><dt className="w-28 shrink-0 text-muted-foreground">Xác nhận</dt><dd><VerificationBadge level={d.verificationLevel} by={d.confirmedByOrganization} /></dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-border bg-card p-4" aria-label="Hành trình lần hiến">
              <h2 className="mb-4 font-semibold">Hành trình lần hiến</h2>
              <ol className="space-y-5">
                {steps.map((s) => (
                  <li key={s.title} className="flex gap-3">
                    {s.done ? <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden /> : <Circle className="mt-0.5 size-6 shrink-0 text-muted-foreground/50" aria-hidden />}
                    <div className={cn(!s.done && "text-muted-foreground")}><p className="font-medium">{s.title}</p><p className="text-sm">{s.line}</p>{s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}</div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-xs text-muted-foreground">Hệ thống chưa theo dõi từng đơn vị máu sau khi nhập kho, nên chưa có mốc xuất kho.</p>
            </section>
          </div>
        )}
    </>
  );
}

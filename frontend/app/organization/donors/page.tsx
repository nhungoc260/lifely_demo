"use client";

import { Phone } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDate } from "@/lib/format";
import { orgApi } from "@/services";

/** Người hiến của cơ sở: chỉ người đã đặt lịch hoặc đã được cơ sở xác nhận hiến. Số điện thoại chỉ hiện khi còn lịch hẹn hiệu lực; không có vị trí. */
export default function OrganizationDonors() {
  const me = useQuery("org-me", orgApi.me);
  const res = useQuery(me.data ? "org-donors" : null, orgApi.donors);
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (res.data ?? []).filter((d) => !t || d.fullName.toLowerCase().includes(t) || (d.bloodType ?? "").toLowerCase() === t);
  }, [res.data, q]);

  return (
    <>
      <PageHeader title="Người hiến của cơ sở" description="Người đã đặt lịch hoặc đã được cơ sở xác nhận hiến (200 người gần nhất). Số điện thoại chỉ hiện khi họ còn lịch hẹn đang hiệu lực; vị trí không bao giờ được hiển thị." />
      {me.data === null ? <ErrorState message="Hãy hoàn tất hồ sơ tổ chức trước." />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.initialLoading || !res.data ? <Skeleton className="h-48" />
        : (
          <div className="space-y-4">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên hoặc nhóm máu (VD: A+)" aria-label="Tìm người hiến" />
            {rows.length === 0 ? <EmptyState title="Chưa có người hiến nào" description="Người hiến sẽ xuất hiện ở đây sau khi đặt lịch hoặc được cơ sở xác nhận hiến." /> : (
              <ul className="grid gap-3 md:grid-cols-2">
                {rows.map((d) => (
                  <li key={d.donorId} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-base font-extrabold text-primary-foreground">{d.bloodType ?? "?"}</span>
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{d.fullName}</p><p className="text-xs text-muted-foreground">{d.lastVisit ? `Gần nhất: ${formatDate(d.lastVisit)}` : "Chưa có lịch sử"}</p></div>
                      {d.phone && <a href={`tel:${d.phone}`} aria-label={`Gọi ${d.fullName}`} className="press grid size-10 place-items-center rounded-full bg-muted text-primary"><Phone className="size-4" /></a>}
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                      <div><dd className="text-lg font-bold text-foreground">{d.donations}</dd><dt>Đã hiến tại đây</dt></div>
                      <div><dd className="text-lg font-bold text-foreground">{d.upcoming}</dd><dt>Lịch sắp tới</dt></div>
                      <div><dd className="text-lg font-bold text-foreground">{d.noShows}</dd><dt>Không đến</dt></div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
    </>
  );
}

"use client";

import { CalendarCheck, Droplets, ShieldCheck, Users } from "lucide-react";
import { useMemo } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { orgApi } from "@/services";
import type { DonationLogEntry } from "@/types/domain";

const LEVEL_LABEL: Record<DonationLogEntry["verificationLevel"], string> = {
  ORG_VERIFIED: "Cơ sở y tế xác nhận",
  REQUESTER_CONFIRMED: "Người nhà xác nhận",
  SELF_REPORTED: "Tự khai",
};

export default function OrganizationDonations() {
  const me = useQuery("org-me", orgApi.me);
  const res = useQuery(me.data ? "org-donations" : null, orgApi.donations);
  const rows = res.data;

  const s = useMemo(() => {
    if (!rows) return null;
    const month = new Date().toISOString().slice(0, 7);
    const byBlood = new Map<string, number>();
    for (const r of rows) if (r.bloodType) byBlood.set(r.bloodType, (byBlood.get(r.bloodType) ?? 0) + 1);
    const top = [...byBlood.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total: rows.length,
      thisMonth: rows.filter((r) => r.donatedOn.startsWith(month)).length,
      donors: new Set(rows.map((r) => r.donorName)).size,
      topBlood: top ? `${top[0]} (${top[1]})` : "–",
    };
  }, [rows]);

  function exportCsv() {
    if (!rows) return;
    downloadCsv(
      `lifely-lich-su-hien-mau-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Ngày hiến", "Người hiến", "Nhóm máu", "Địa điểm", "Mức xác nhận"],
      rows.map((r) => [formatDate(r.donatedOn), r.donorName, r.bloodType ?? "", r.location ?? "", LEVEL_LABEL[r.verificationLevel]]),
    );
  }

  return (
    <>
      <PageHeader
        title="Lịch sử hiến máu"
        description="Các lần hiến máu do cơ sở của bạn đã xác nhận (200 lần gần nhất). Để xác nhận, mở yêu cầu và bấm xác nhận cạnh người hiến đã nhận lời."
        actions={<Button variant="outline" onClick={exportCsv} disabled={!rows || rows.length === 0}>Xuất CSV</Button>}
      />
      {me.data === null ? <ErrorState message="Hãy hoàn tất hồ sơ tổ chức trước." />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.initialLoading || !rows || !s ? <Skeleton className="h-72" />
        : rows.length === 0 ? <EmptyState title="Chưa có lần hiến nào được xác nhận" description="Khi người hiến đến hiến máu và cơ sở bấm xác nhận trong trang chi tiết yêu cầu, lịch sử sẽ hiện ở đây." />
        : (
          <>
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              <StatCard label="Lần hiến đã xác nhận" value={s.total} icon={ShieldCheck} accent />
              <StatCard label="Trong tháng này" value={s.thisMonth} icon={CalendarCheck} />
              <StatCard label="Số người hiến" value={s.donors} icon={Users} />
              <StatCard label="Nhóm máu nhiều nhất" value={s.topBlood} icon={Droplets} />
            </div>
            <ul className="mt-5 space-y-3 md:hidden">
              {rows.map((r) => (
                <li key={r.id} className="rounded-2xl bg-card p-4 ring-1 ring-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-[15px] font-semibold [overflow-wrap:anywhere]">{r.donorName}</p>
                    <span className="shrink-0 rounded-xl bg-secondary px-2.5 py-1 text-sm font-bold text-secondary-foreground">{r.bloodType ?? "–"}</span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Ngày hiến</dt><dd className="tabular-nums">{formatDate(r.donatedOn)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Địa điểm</dt><dd className="text-right">{r.location ?? "–"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Xác nhận</dt><dd className="text-right">{LEVEL_LABEL[r.verificationLevel]}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
            <Card className="mt-6 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Ngày hiến</th>
                    <th className="px-5 py-3 font-medium">Người hiến</th>
                    <th className="px-5 py-3 font-medium">Nhóm máu</th>
                    <th className="px-5 py-3 font-medium">Địa điểm</th>
                    <th className="px-5 py-3 font-medium">Mức xác nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-5 py-3 tabular-nums">{formatDate(r.donatedOn)}</td>
                      <td className="px-5 py-3 font-medium">{r.donorName}</td>
                      <td className="px-5 py-3">{r.bloodType ?? "–"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{r.location ?? "–"}</td>
                      <td className="px-5 py-3">{LEVEL_LABEL[r.verificationLevel]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
    </>
  );
}

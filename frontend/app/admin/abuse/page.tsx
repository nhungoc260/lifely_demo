"use client";

import { Check, Loader2, ShieldAlert, Siren, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { AUTO_ACTION_LABEL, ruleLabel, SEVERITY_LABEL, SUBJECT_LABEL } from "@/lib/abuse";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adminApi } from "@/services";
import type { AbuseFlagRow, AbuseStatus } from "@/types/domain";

const TABS: { id: AbuseStatus | "ALL"; label: string }[] = [
  { id: "OPEN", label: "Chờ xử lý" }, { id: "CONFIRMED", label: "Đã xác nhận vi phạm" }, { id: "DISMISSED", label: "Đã bỏ qua" }, { id: "ALL", label: "Tất cả" },
];

function subjectHref(f: AbuseFlagRow): string | null {
  return f.subjectType === "REQUEST" ? `/admin/requests/${f.subjectId}` : null;
}

export default function AdminAbuse() {
  const [tab, setTab] = useState<AbuseStatus | "ALL">("OPEN");
  const q = useQuery(`admin-abuse-${tab}`, () => adminApi.abuseFlags(tab));
  const [busy, setBusy] = useState<string | null>(null);
  const d = q.data;

  async function review(f: AbuseFlagRow, decision: "CONFIRMED" | "DISMISSED") {
    setBusy(f.id + decision);
    try {
      await adminApi.reviewAbuseFlag(f.id, decision, decision === "CONFIRMED" ? "Admin xác nhận bất thường" : "Admin đã xem, không vi phạm");
      toast.success(decision === "CONFIRMED" ? "Đã xác nhận. Yêu cầu còn hiệu lực đã được hủy." : "Đã bỏ qua cờ này.");
      q.reload();
    } catch (e) { toast.error(toApiError(e).message); q.reload(); }
    finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="Giám sát bất thường" description="Yêu cầu máu được duyệt tự động. Hệ thống dừng ngay khi tín hiệu rất mạnh (cờ mức Cao) và để lọt vào hàng đợi này những ca cần admin xem. Xác nhận vi phạm sẽ hủy yêu cầu còn hiệu lực; bỏ qua nghĩa là ca hợp lệ." />
      {q.initialLoading ? <Skeleton className="h-96" />
        : q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : d && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Đang chờ xử lý" value={d.open} icon={Siren} accent />
              <StatCard label="Mức cao chờ xử lý" value={d.openHigh} icon={ShieldAlert} />
              <StatCard label="Hệ thống đã tự dừng" value={d.autoActions} icon={ShieldAlert} />
              <StatCard label="Đã xác nhận / bỏ qua" value={`${d.confirmed} / ${d.dismissed}`} icon={Check} />
            </div>

            <div role="tablist" aria-label="Lọc theo trạng thái" className="mt-6 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={cn("min-h-10 rounded-full border px-4 text-sm font-medium", tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>{t.label}</button>
              ))}
            </div>

            <Card className="mt-4">
              <CardHeader><CardTitle>Danh sách cờ</CardTitle></CardHeader>
              <CardContent>
                {d.rows.length === 0 ? <EmptyState title="Không có cờ nào" description="Chưa phát hiện bất thường ở mục này." /> : (
                  <ul className="divide-y divide-border">
                    {d.rows.map((f) => {
                      const rule = ruleLabel(f.ruleCode);
                      const href = subjectHref(f);
                      return (
                        <li key={f.id} className="space-y-2 py-4 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill t={f.severity === "HIGH" ? "red" : "amber"}>{SEVERITY_LABEL[f.severity]}</Pill>
                            <Pill t="slate">{SUBJECT_LABEL[f.subjectType]}</Pill>
                            <span className="font-semibold">{rule.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(f.createdAt)}</span>
                          </div>
                          <p>{f.detail}</p>
                          {rule.why && <p className="text-xs text-muted-foreground">{rule.why}</p>}
                          <p className="text-xs">
                            {href ? <Link href={href} className="font-medium text-primary underline">{f.subjectLabel ?? "Xem đối tượng"}</Link> : <span className="font-medium">{f.subjectLabel ?? "Đối tượng đã bị xóa"}</span>}
                            <span className="text-muted-foreground"> · {AUTO_ACTION_LABEL[f.autoAction]}</span>
                          </p>
                          {f.status === "OPEN" ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button size="sm" className="bg-critical text-white hover:bg-critical/90" disabled={busy !== null} onClick={() => review(f, "CONFIRMED")}>
                                {busy === f.id + "CONFIRMED" ? <Loader2 className="animate-spin" /> : <X />} Xác nhận vi phạm
                              </Button>
                              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => review(f, "DISMISSED")}>
                                {busy === f.id + "DISMISSED" ? <Loader2 className="animate-spin" /> : <Check />} Bỏ qua, ca hợp lệ
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">{f.status === "CONFIRMED" ? "Đã xác nhận vi phạm" : "Đã bỏ qua"}{f.reviewedAt ? ` lúc ${formatDateTime(f.reviewedAt)}` : ""}{f.reviewNote ? `: ${f.reviewNote}` : ""}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
    </>
  );
}

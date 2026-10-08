"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Pill } from "@/components/ui/badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { CONTACT_STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { adminApi } from "@/services";
import type { ContactStatus } from "@/types/domain";

const TONE = { NEW: "red", READ: "amber", RESOLVED: "green" } as const;

export default function AdminMessages() {
  const [status, setStatus] = useState<ContactStatus | "">("NEW");
  const [page, setPage] = useState(0);
  const res = useQuery(`admin-messages:${status}:${page}`, () => adminApi.messages({ status: status || undefined, page, size: 10 }));

  async function update(id: string, next: ContactStatus) {
    try { await adminApi.updateMessage(id, next); toast.success(next === "RESOLVED" ? "Đã đánh dấu là đã xử lý" : "Đã đánh dấu là đã đọc"); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); }
  }

  return (
    <>
      <PageHeader title="Tin nhắn" description="Các tin nhắn gửi qua form liên hệ. Mỗi tin cũng được gửi email tới hộp thư admin khi đã cấu hình email." />
      <div className="mb-5 max-w-xs"><label htmlFor="msg-status" className="sr-only">Trạng thái</label>
        <Select id="msg-status" value={status} onChange={(e) => { setStatus(e.target.value as ContactStatus | ""); setPage(0); }}><option value="">Tất cả</option><option value="NEW">Mới</option><option value="READ">Đã đọc</option><option value="RESOLVED">Đã xử lý</option></Select></div>
      {res.initialLoading ? <Skeleton className="h-72" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="Chưa có tin nhắn" description="Hiện chưa có gì ở đây." />
        : res.data && (
          <>
            <ul className="space-y-4">
              {res.data.items.map((m) => (
                <li key={m.id}>
                  <Card className={cn("p-5", m.status === "NEW" && "border-primary/40")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{m.name} {m.fromRegisteredUser && <Pill t="blue" className="ml-1">Thành viên</Pill>}</p>
                        <p className="text-sm text-muted-foreground">{m.email}{m.phone ? ` · ${m.phone}` : ""} · {formatDateTime(m.createdAt)}</p>
                      </div>
                      <Pill t={TONE[m.status]}>{CONTACT_STATUS_LABEL[m.status]}</Pill>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to LIFELY")}`} className={buttonVariants({ size: "sm", variant: "outline" })} onClick={() => m.status === "NEW" && update(m.id, "READ")}><Mail /> Trả lời qua email</a>
                      {m.status === "NEW" && <Button size="sm" variant="ghost" onClick={() => update(m.id, "READ")}>Đánh dấu đã đọc</Button>}
                      {m.status !== "RESOLVED" && <Button size="sm" onClick={() => update(m.id, "RESOLVED")}>Đánh dấu đã xử lý</Button>}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
    </>
  );
}

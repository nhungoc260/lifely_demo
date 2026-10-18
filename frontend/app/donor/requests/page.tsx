"use client";

import { useState } from "react";

import { MatchCard, MatchRow } from "@/components/donor/match-card";
import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ListGroup, Segmented } from "@/components/ui/mobile";
import { useNow } from "@/hooks/use-now";
import { useQuery } from "@/hooks/use-query";
import { cn } from "@/lib/utils";
import { donorApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";

const TABS = [
  { key: "open", label: "Cần phản hồi" },
  { key: "ACCEPTED", label: "Đã nhận lời" },
  { key: "history", label: "Đã qua" },
] as const;

export default function DonorRequests() {
  const { version } = useNotifications();
  const now = useNow();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");
  const q = useQuery(`donor-matches:${version}`, () => donorApi.matches());
  const items = (q.data ?? []).filter((m) =>
    tab === "open" ? (m.status === "CONTACTED" || m.status === "PENDING") && new Date(m.deadline).getTime() > now
      : tab === "ACCEPTED" ? m.status === "ACCEPTED"
      : !(m.status === "CONTACTED" || m.status === "PENDING" || m.status === "ACCEPTED") || new Date(m.deadline).getTime() <= now);

  return (
    <>
      <PageHeader title="Yêu cầu" description="Các yêu cầu LIFELY kết nối với bạn. Điều kiện hiến máu luôn do nhân viên y tế quyết định." />
      <Segmented className="mb-5 md:hidden" label="Lọc yêu cầu" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.key, label: t.label }))} />
      <div role="tablist" aria-label="Lọc yêu cầu" className="mb-6 hidden rounded-xl border border-border bg-card p-1 md:inline-flex">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cn("rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === t.key && "bg-secondary text-secondary-foreground")}>{t.label}</button>
        ))}
      </div>
      {q.initialLoading ? <div className="grid gap-3 md:grid-cols-2 md:gap-5"><Skeleton className="h-24 md:h-60" /><Skeleton className="h-24 md:h-60" /></div>
        : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : items.length === 0 ? <EmptyState title="Chưa có gì ở đây" description={tab === "open" ? "Hiện chưa có yêu cầu nào phù hợp với hồ sơ của bạn." : "Các yêu cầu sẽ hiện ở đây khi bạn phản hồi."} />
        : <>
            <ListGroup className="md:hidden">{items.map((m) => <MatchRow key={m.matchId} m={m} />)}</ListGroup>
            <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3">{items.map((m) => <MatchCard key={m.matchId} m={m} />)}</div>
          </>}
    </>
  );
}

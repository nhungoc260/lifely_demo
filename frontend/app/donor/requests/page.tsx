"use client";

import { useState } from "react";

import { MatchCard } from "@/components/donor/match-card";
import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useNow } from "@/hooks/use-now";
import { useQuery } from "@/hooks/use-query";
import { cn } from "@/lib/utils";
import { donorApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";

const TABS = [
  { key: "open", label: "Needs your response" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "history", label: "Past" },
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
      <PageHeader title="Requests" description="Requests LIFELY matched to you. Final eligibility is always confirmed by healthcare professionals." />
      <div role="tablist" aria-label="Request filter" className="mb-6 inline-flex rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cn("rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === t.key && "bg-secondary text-secondary-foreground")}>{t.label}</button>
        ))}
      </div>
      {q.initialLoading ? <div className="grid gap-5 md:grid-cols-2"><Skeleton className="h-60" /><Skeleton className="h-60" /></div>
        : q.error && !q.data ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : items.length === 0 ? <EmptyState title="Nothing here yet" description={tab === "open" ? "There are currently no requests matching your profile." : "Requests will appear here as you respond to them."} />
        : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((m) => <MatchCard key={m.matchId} m={m} />)}</div>}
    </>
  );
}

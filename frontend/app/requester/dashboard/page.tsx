"use client";

import { CheckCircle2, ClipboardList, MessageSquareReply, Plus, UsersRound } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { requestApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";

export default function RequesterDashboard() {
  const { version } = useNotifications();
  const dash = useQuery(`req-dash:${version}`, requestApi.dashboard);
  const recent = useQuery(`req-recent:${version}`, () => requestApi.list({ size: 5 }));

  return (
    <>
      <PageHeader title="Dashboard" description="Your requests at a glance." actions={<Link href="/requester/requests/create" className={buttonVariants()}><Plus /> New request</Link>} />
      {dash.error && !dash.data ? <ErrorState message={dash.error.message} onRetry={dash.reload} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Active Requests" value={dash.data?.activeRequests ?? 0} icon={ClipboardList} accent loading={dash.initialLoading} />
          <StatCard label="Confirmed Donors" value={dash.data?.confirmedDonors ?? 0} icon={UsersRound} loading={dash.initialLoading} />
          <StatCard label="Responses" value={dash.data?.responses ?? 0} icon={MessageSquareReply} loading={dash.initialLoading} />
          <StatCard label="Completed Requests" value={dash.data?.completedRequests ?? 0} icon={CheckCircle2} loading={dash.initialLoading} />
        </div>
      )}
      <section className="mt-10" aria-labelledby="recent">
        <div className="mb-4 flex items-end justify-between"><h2 id="recent" className="text-xl font-semibold tracking-tight">Recent requests</h2><Link href="/requester/requests" className="text-sm font-medium text-primary hover:underline">View all</Link></div>
        {recent.initialLoading ? <Skeleton className="h-40" />
          : recent.error && !recent.data ? <ErrorState message={recent.error.message} onRetry={recent.reload} />
          : recent.data && recent.data.items.length === 0 ? <EmptyState title="No requests yet" description="Need blood for a patient? Create a request and we will find donors." action={<Link href="/requester/requests/create" className={buttonVariants()}>Create a request</Link>} />
          : <ul className="space-y-3">{recent.data?.items.map((r) => (
              <li key={r.id}><Link href={`/requester/requests/${r.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="p-5 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><BloodChip type={r.bloodType} /><UrgencyBadge urgency={r.urgency} /><StatusBadge status={r.status} /></div><span className="text-sm text-muted-foreground">{["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.status) ? "Closed" : <Countdown deadline={r.deadline} className="font-medium text-foreground" />}</span></div>
                <p className="mt-3 font-medium">{r.hospitalName}</p>
                <div className="mt-3 flex items-center gap-3"><ProgressBar className="flex-1" value={r.unitsConfirmed} max={r.unitsRequired} label="Donors confirmed" /><span className="text-sm tabular-nums text-muted-foreground">{r.unitsConfirmed} / {r.unitsRequired}</span></div>
              </Card></Link></li>))}</ul>}
      </section>
    </>
  );
}

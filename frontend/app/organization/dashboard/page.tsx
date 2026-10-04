"use client";

import { Activity, AlertOctagon, BadgeCheck, CheckCircle2, Percent } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { OrgStatusBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { orgApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";

export default function OrganizationDashboard() {
  const { version } = useNotifications();
  const me = useQuery("org-me", orgApi.me);
  const dash = useQuery(me.data ? `org-dash:${version}` : null, orgApi.dashboard);
  const verified = me.data?.verificationStatus === "VERIFIED";

  return (
    <>
      <PageHeader title="Organization dashboard" description={me.data?.name ?? "Set up your organization to start coordinating."} actions={verified ? <Link href="/organization/requests/create" className={buttonVariants()}>New request</Link> : undefined} />
      {me.error && !me.data ? <ErrorState message={me.error.message} onRetry={me.reload} /> : me.data === null ? (
        <Card className="p-8 text-center"><p className="text-lg font-semibold">Complete your organization profile</p><p className="mt-1 text-sm text-muted-foreground">Add your details and verification documents so our team can verify you.</p><Link href="/organization/profile" className={buttonVariants({ className: "mt-5" })}>Set up organization</Link></Card>
      ) : (
        <>
          {me.data && !verified && (
            <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning/5 p-5">
              <div><p className="flex items-center gap-2 font-medium">Verification <OrgStatusBadge status={me.data.verificationStatus} /></p><p className="mt-1 text-sm text-muted-foreground">{me.data.verificationStatus === "REJECTED" ? (me.data.verificationNote ?? "Please update your details and resubmit.") : "Until you are verified, your requests are reviewed by an administrator before donors are contacted."}</p></div>
              <Link href="/organization/profile" className={buttonVariants({ size: "sm", variant: "outline" })}>Manage verification</Link>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Verification" value={me.data ? <OrgStatusBadge status={me.data.verificationStatus} /> : "–"} icon={BadgeCheck} loading={me.initialLoading} />
            <StatCard label="Active Requests" value={dash.data?.activeRequests ?? 0} icon={Activity} accent loading={dash.initialLoading} />
            <StatCard label="Critical Requests" value={dash.data?.criticalRequests ?? 0} icon={AlertOctagon} loading={dash.initialLoading} />
            <StatCard label="Completed Requests" value={dash.data?.completedRequests ?? 0} icon={CheckCircle2} loading={dash.initialLoading} />
            <StatCard label="Response Rate" value={`${dash.data?.responseRate ?? 0}%`} icon={Percent} loading={dash.initialLoading} hint="Contacted donors who replied" />
          </div>
        </>
      )}
    </>
  );
}

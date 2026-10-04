"use client";

import { AlertOctagon, Building2, CheckCheck, ClipboardList, Handshake, Users, HeartPulse } from "lucide-react";
import Link from "next/link";

import { BloodTypeChart, DonorGrowth, RequestsOverTime, ResponseChart, StatusChart } from "@/components/admin/charts";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api";
import { adminApi } from "@/services";

export default function AdminDashboard() {
  const q = useQuery("admin-dash", adminApi.dashboard);
  const [sending, setSending] = useState(false);

  async function emailReport() {
    setSending(true);
    try { await adminApi.emailSummary(); toast.success("The summary report is on its way to your mailbox"); }
    catch (e) { toast.error(toApiError(e).message); } finally { setSending(false); }
  }
  const d = q.data;
  const k = d?.kpi;
  const L = q.initialLoading;

  return (
    <>
      <PageHeader title="Admin dashboard" description="System health and coordination activity." actions={<Button variant="outline" size="sm" onClick={emailReport} disabled={sending}><Mail /> Email me this report</Button>} />
      {q.error && !d ? <ErrorState message={q.error.message} onRetry={q.reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Users" value={k?.users ?? 0} icon={Users} loading={L} />
            <StatCard label="Donors" value={k?.donors ?? 0} icon={HeartPulse} loading={L} />
            <StatCard label="Active Requests" value={k?.activeRequests ?? 0} icon={ClipboardList} accent loading={L} />
            <StatCard label="Critical Requests" value={k?.criticalRequests ?? 0} icon={AlertOctagon} loading={L} />
            <StatCard label="Verified Organizations" value={k?.verifiedOrganizations ?? 0} icon={Building2} loading={L} />
            <StatCard label="Completed Matches" value={k?.completedMatches ?? 0} icon={Handshake} loading={L} hint={`${k?.confirmedMatches ?? 0} confirmed in total`} />
          </div>
          {k && (k.pendingVerification > 0 || k.organizationsUnderReview > 0 || k.openReports > 0 || k.newMessages > 0) && (
            <Card className="mt-6 border-warning/40 bg-warning/5 p-5">
              <p className="flex items-center gap-2 font-medium"><CheckCheck className="size-4" aria-hidden />Needs your attention</p>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {k.pendingVerification > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/requests">{k.pendingVerification} request(s)</Link> awaiting verification</li>}
                {k.organizationsUnderReview > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/organizations">{k.organizationsUnderReview} organization(s)</Link> under review</li>}
                {k.newMessages > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/messages">{k.newMessages} new message(s)</Link></li>}
                {k.openReports > 0 && <li><Link className="font-medium text-primary hover:underline" href="/admin/reports">{k.openReports} open report(s)</Link></li>}
              </ul>
            </Card>
          )}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Requests over time (14 days)</CardTitle></CardHeader><CardContent>{d ? <RequestsOverTime data={d.requestsOverTime} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Donor growth (6 months)</CardTitle></CardHeader><CardContent>{d ? <DonorGrowth data={d.donorGrowth} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Blood type distribution</CardTitle></CardHeader><CardContent>{d ? <BloodTypeChart data={d.bloodTypeDistribution} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Request status</CardTitle></CardHeader><CardContent>{d ? <StatusChart data={d.requestStatus} /> : <Skeleton className="h-[260px]" />}</CardContent></Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Emergency response: average minutes from contact to reply</CardTitle></CardHeader><CardContent>{d ? (d.emergencyResponse.length ? <ResponseChart data={d.emergencyResponse} /> : <p className="py-10 text-center text-sm text-muted-foreground">No responses recorded yet.</p>) : <Skeleton className="h-[260px]" />}</CardContent></Card>
          </div>
        </>
      )}
    </>
  );
}

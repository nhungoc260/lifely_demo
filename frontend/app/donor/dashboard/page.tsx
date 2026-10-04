"use client";

import { Bell, Droplets, HeartPulse, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MatchCard } from "@/components/donor/match-card";
import { ReadinessCard } from "@/components/donor/readiness-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useNow } from "@/hooks/use-now";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { donorApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";
import { useAuth } from "@/providers/auth-provider";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const ACTIVE = ["VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"];

export default function DonorDashboard() {
  const { user } = useAuth();
  const { version } = useNotifications();
  const now = useNow();
  const dash = useQuery(`donor-dash:${version}`, donorApi.dashboard);
  const profile = useQuery("donor-dash-profile", donorApi.me);
  const matches = useQuery(`donor-open-matches:${version}`, () => donorApi.matches());
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [greet, setGreet] = useState("Hello");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreet(greeting());
  }, []);
  const isAvailable = available ?? dash.data?.availability === "AVAILABLE";

  async function toggle(next: boolean) {
    setAvailable(next);
    setSaving(true);
    try {
      await donorApi.setAvailability(next ? "AVAILABLE" : "NOT_AVAILABLE");
      toast.success(next ? "You are now available to donate" : "You will not receive new requests");
      dash.reload();
    } catch (e) {
      setAvailable(!next);
      toast.error(toApiError(e).message);
    } finally { setSaving(false); }
  }

  const open = (matches.data ?? []).filter((m) => (m.status === "CONTACTED" || m.status === "PENDING")
    && new Date(m.deadline).getTime() > now && ACTIVE.includes(m.requestStatus));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greet}, {user?.fullName}</h1>
          <p className={cn("mt-2 inline-flex items-center gap-2 text-sm font-medium", isAvailable ? "text-success" : "text-muted-foreground")}>
            <span className={cn("size-2 rounded-full", isAvailable ? "bg-success" : "bg-muted-foreground")} aria-hidden />
            {isAvailable ? "Available to donate" : "Not available"}
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium">
          Available
          <Switch checked={isAvailable} disabled={saving || dash.initialLoading} onCheckedChange={toggle} aria-label="Available to donate" />
        </label>
      </div>

      {dash.data && !dash.data.profileComplete && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning/5 p-5">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-warning" aria-hidden /><div><p className="font-medium">Complete your profile to be matched</p><p className="text-sm text-muted-foreground">We need your blood type and general location to find requests near you.</p></div></div>
          <Link href="/donor/profile" className={buttonVariants({ size: "sm" })}>Complete profile</Link>
        </Card>
      )}

      {dash.error && !dash.data ? <ErrorState message={dash.error.message} onRetry={dash.reload} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Blood Type" value={dash.data?.bloodType ?? "–"} icon={Droplets} accent loading={dash.initialLoading} />
          <StatCard label="Availability" value={isAvailable ? "Available" : "Off"} icon={ShieldCheck} loading={dash.initialLoading} />
          <StatCard label="Nearby Requests" value={dash.data?.nearbyRequests ?? 0} icon={HeartPulse} loading={dash.initialLoading} />
          <StatCard label="Confirmed Donations" value={dash.data?.confirmedDonations ?? 0} icon={Bell} loading={dash.initialLoading} />
        </div>
      )}

      {profile.data && <div className="mt-6"><ReadinessCard lastDonationDate={profile.data.lastDonationDate} totalDonations={profile.data.totalDonations} /></div>}

      <section className="mt-10" aria-labelledby="needs-you">
        <div className="mb-4 flex items-end justify-between"><h2 id="needs-you" className="text-xl font-semibold tracking-tight">Requests that may need you</h2><Link href="/donor/requests" className="text-sm font-medium text-primary hover:underline">View all</Link></div>
        {matches.initialLoading ? <div className="grid gap-5 md:grid-cols-2"><Skeleton className="h-60" /><Skeleton className="h-60" /></div>
          : matches.error && !matches.data ? <ErrorState message={matches.error.message} onRetry={matches.reload} />
          : open.length === 0 ? <EmptyState title="No emergency requests nearby." description={isAvailable ? "There are currently no requests matching your profile. We will notify you when one appears." : "Turn on availability so LIFELY can match you with requests."} action={!isAvailable ? <button onClick={() => toggle(true)} className={buttonVariants({ size: "sm" })}>Turn availability on</button> : undefined} />
          : <div className="grid gap-5 md:grid-cols-2">{open.slice(0, 4).map((m) => <MatchCard key={m.matchId} m={m} />)}</div>}
      </section>
    </>
  );
}

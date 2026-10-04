"use client";

import { ArrowLeft, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { MapContainerLazy } from "@/components/map/map-dynamic";
import { ReportDialog } from "@/components/requests/report-dialog";
import { BloodChip, UrgencyBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { publicApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";

export default function PublicRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { role, status } = useAuth();
  const q = useQuery(`public-request:${id}`, () => publicApi.request(id));
  const r = q.data;


  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <Link href="/#requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All requests</Link>
        {q.initialLoading ? (
          <Skeleton className="mt-6 h-96" />
        ) : q.error && !r ? (
          q.error.status === 404 ? (
            <EmptyState className="mt-6" title="This request is no longer open" description="It may have been fulfilled, cancelled or expired." action={<Link href="/#requests" className={buttonVariants()}>See open requests</Link>} />
          ) : <ErrorState className="mt-6" message={q.error.message} onRetry={q.reload} />
        ) : r ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-6 sm:p-8">
              <div className="flex items-center justify-between"><UrgencyBadge urgency={r.urgency} /><BloodChip type={r.bloodType} className="text-lg" /></div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight">{r.unitsNeeded} unit{r.unitsNeeded === 1 ? "" : "s"} needed</h1>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Confirmed</span><span className="font-medium tabular-nums">{r.unitsConfirmed} / {r.unitsRequired}</span></div>
                <ProgressBar value={r.unitsConfirmed} max={r.unitsRequired} label="Donors confirmed" />
              </div>
              <dl className="mt-8 space-y-4 text-sm">
                <div className="flex gap-3"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden /><div><dt className="text-muted-foreground">Hospital</dt><dd className="font-medium">{r.hospitalName}</dd><dd className="text-muted-foreground">{[r.district, r.city].filter(Boolean).join(", ")}</dd></div></div>
                <div className="flex gap-3"><Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden /><div><dt className="text-muted-foreground">Needed within</dt><dd className="text-2xl font-semibold"><Countdown deadline={r.deadline} /></dd></div></div>
              </dl>
              <div className="mt-8 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                {status === "authenticated" && role === "DONOR" ? (
                  <>If this request fits you, LIFELY will notify you directly. <Link href="/donor/requests" className="font-medium text-primary hover:underline">See your matched requests</Link>.</>
                ) : (
                  <>Want to help? <Link href="/register?role=DONOR" className="font-medium text-primary hover:underline">Join as a donor</Link> so LIFELY can notify you when a request matches you.</>
                )}
              </div>
              {status === "authenticated" && <div className="mt-4 flex justify-end"><ReportDialog targetType="REQUEST" targetId={r.id} /></div>}
            </Card>
            <div className="space-y-4">
              <MapContainerLazy center={[r.latitude, r.longitude]} zoom={14} requests={[r]} height={320} scrollWheelZoom={false} />
              <p className="text-xs text-muted-foreground">Final donation eligibility must be confirmed by healthcare professionals. Contact details are shared only with donors who accept.</p>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

"use client";

import { Building2, HeartPulse, LocateFixed, LockKeyhole, Radio, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { MapContainerLazy } from "@/components/map/map-dynamic";
import { RequestCard } from "@/components/requests/request-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { cn } from "@/lib/utils";
import { publicApi } from "@/services";

export function Impact() {
  const stats = useQuery("public-stats", publicApi.stats);
  const s = stats.data;
  const items = [
    { label: "Registered Donors", v: s?.registeredDonors },
    { label: "Active Requests", v: s?.activeRequests },
    { label: "Successful Connections", v: s?.successfulConnections },
    { label: "Verified Organizations", v: s?.verifiedOrganizations },
  ];
  return (
    <section className="border-y border-border bg-card" aria-labelledby="impact-title">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 id="impact-title" className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">One platform. Faster coordination.</h2>
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.label} className="border-l-2 border-primary/30 pl-5">
              <dd className="text-5xl font-semibold tabular-nums tracking-tight">{i.v === undefined ? <Skeleton className="h-12 w-20" /> : <CountUp value={i.v} />}</dd>
              <dt className="mt-2 text-sm text-muted-foreground">{i.label}</dt>
            </div>
          ))}
        </dl>
        {stats.error && <p className="mt-6 text-sm text-muted-foreground">Live figures are temporarily unavailable.</p>}
        {s?.demoEnvironment && <p className="mt-6 text-xs text-muted-foreground">Demo environment: figures come from sample data.</p>}
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Create a request.", text: "Tell us the blood type, units, hospital and deadline. Requests are verified before anyone is contacted." },
  { n: "02", title: "LIFELY finds suitable donors.", text: "Compatible, available donors nearby are ranked and contacted in widening circles, never all at once." },
  { n: "03", title: "Donors respond and the request is coordinated.", text: "Responses arrive in real time. The count never exceeds what the patient needs." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24" aria-labelledby="how-title">
      <h2 id="how-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">How LIFELY works</h2>
      <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        <div aria-hidden className="absolute left-[19px] top-2 hidden h-[calc(100%-1rem)] w-px bg-border max-md:block" />
        <div aria-hidden className="absolute left-0 right-0 top-[19px] hidden h-px bg-border md:block" />
        {STEPS.map((s) => (
          <li key={s.n} className="relative pl-14 md:pl-0 md:pt-14">
            <span className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums text-primary">{s.n}</span>
            <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EmergencyRequests() {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const key = `public-requests:${loc ? `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}` : "all"}`;
  const q = useQuery(key, () => publicApi.requests({ size: 6, lat: loc?.lat, lng: loc?.lng }));

  function locate() {
    if (!("geolocation" in navigator)) return toast.error("Your browser does not support location.");
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast.error("We could not get your location."),
      { timeout: 8000 },
    );
  }

  return (
    <section id="requests" className="scroll-mt-20 bg-surface py-24" aria-labelledby="req-title">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="req-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Emergency requests near you</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={locate}><LocateFixed /> {loc ? "Distances from your location" : "Show distance from me"}</Button>
            <Link href="/map" className={buttonVariants({ variant: "ghost", size: "sm" })}>Open map</Link>
          </div>
        </div>
        <div className="mt-10">
          {q.initialLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>
          ) : q.error && !q.data ? (
            <ErrorState message={q.error.message} onRetry={q.reload} />
          ) : q.data && q.data.items.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {q.data.items.map((r) => <RequestCard key={r.id} r={r} href={`/requests/${r.id}`} />)}
            </div>
          ) : (
            <EmptyState title="No emergency requests nearby." description="There are currently no verified open requests. Join as a donor to be notified when one appears." action={<Link href="/register?role=DONOR" className={buttonVariants()}>Become a donor</Link>} />
          )}
        </div>
      </div>
    </section>
  );
}

export function MapPreview() {
  const reqs = useQuery("map-preview-requests", () => publicApi.requests({ size: 50 }));
  const orgs = useQuery("map-preview-orgs", publicApi.organizations);
  return (
    <section className="mx-auto max-w-6xl px-5 py-24" aria-labelledby="map-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="map-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">See where help is needed</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Hospitals and open requests only. LIFELY never shows the location of any donor.</p>
        </div>
        <Link href="/map" className={buttonVariants({ variant: "outline" })}>Open full map</Link>
      </div>
      <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-border shadow-sm">
        <MapContainerLazy requests={reqs.data?.items ?? []} hospitals={orgs.data ?? []} height={420} scrollWheelZoom={false} />
      </div>
    </section>
  );
}

export function Audiences() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-24 md:grid-cols-2">
        <Card id="donors" className="scroll-mt-24 p-8">
          <HeartPulse className="size-7 text-primary" aria-hidden />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">For donors</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tell us your blood type and general area, turn availability on, and get notified only when a verified request truly needs you. You always see why you were matched, and you stay in control of your privacy.</p>
          <Link href="/register?role=DONOR" className={cn(buttonVariants(), "mt-6")}>Join as a donor</Link>
        </Card>
        <Card id="organizations" className="scroll-mt-24 p-8">
          <Building2 className="size-7 text-primary" aria-hidden />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">For organizations</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Hospitals and blood centers register, get verified by our team, and then create requests that skip the queue, track responses in real time and confirm donations.</p>
          <Link href="/register?role=ORGANIZATION" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>Register your organization</Link>
        </Card>
      </div>
    </section>
  );
}

export function Trust() {
  const items = [
    { icon: LockKeyhole, title: "Privacy-first", text: "Exact donor locations and phone numbers are never public." },
    { icon: UserCheck, title: "Verified organizations", text: "Every organization is reviewed by our team before it can verify requests." },
    { icon: ShieldCheck, title: "Secure accounts", text: "Hashed passwords, short-lived sessions and complete audit trails." },
    { icon: Radio, title: "Real-time coordination", text: "Confirmations update instantly, without refreshing the page." },
  ];
  return (
    <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24" aria-labelledby="trust-title">
      <h2 id="trust-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Built to be trusted</h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title}>
            <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><i.icon className="size-5" aria-hidden /></span>
            <h3 className="mt-4 font-semibold">{i.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{i.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-14 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
        LIFELY is a coordination platform and does not provide medical diagnosis, treatment, transfusion decisions, or final donor eligibility decisions. Final eligibility and transfusion decisions must be made by qualified healthcare professionals.
      </p>
    </section>
  );
}

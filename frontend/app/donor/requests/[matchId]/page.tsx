"use client";

import { ArrowLeft, Check, Clock, Loader2, MapPin, Minus, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { MatchScore } from "@/components/donor/match-card";
import { ReportDialog } from "@/components/requests/report-dialog";
import { BloodChip, MatchBadge, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Countdown } from "@/components/ui/countdown";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { donorApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";

function Row({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2 font-medium">
        {value && <span className="tabular-nums">{value}</span>}
        {ok ? <Check className="size-4 text-success" aria-label="Yes" /> : <Minus className="size-4 text-muted-foreground" aria-label="No" />}
      </span>
    </li>
  );
}

export default function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const { version } = useNotifications();
  const q = useQuery(`match:${matchId}:${version}`, () => donorApi.match(matchId));
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const m = q.data;

  async function accept() {
    setBusy("accept");
    try {
      const updated = await donorApi.accept(matchId);
      q.mutate(() => updated);
      toast.success("Thank you! The requester has been notified.");
    } catch (e) {
      const err = toApiError(e);
      toast.error(err.message);
      q.reload(); // trạng thái có thể đã đổi (ví dụ đã đủ người)
    } finally { setBusy(null); }
  }

  async function reject() {
    const updated = await donorApi.reject(matchId).catch((e) => { toast.error(toApiError(e).message); q.reload(); return null; });
    if (updated) { q.mutate(() => updated); toast.success("Response recorded. Thank you for letting us know."); }
  }

  const open = m && (m.status === "CONTACTED" || m.status === "PENDING");
  const closed = m && open && !(["VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"] as string[]).includes(m.requestStatus);

  return (
    <>
      <Link href="/donor/requests" className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Requests</Link>
      {q.initialLoading ? <Skeleton className="h-[28rem]" />
        : q.error && !m ? <ErrorState message={q.error.message} onRetry={q.reload} />
        : m ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2"><UrgencyBadge urgency={m.urgency} /><StatusBadge status={m.requestStatus} /><MatchBadge status={m.status} /></div>
                <MatchScore value={m.matchingScore} />
              </div>
              <div className="mt-6 flex items-center gap-4"><BloodChip type={m.bloodType} className="text-xl" /><h1 className="text-3xl font-semibold tracking-tight">{m.unitsNeeded} unit{m.unitsNeeded === 1 ? "" : "s"} needed</h1></div>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Confirmed</span><span className="font-medium tabular-nums">{m.unitsConfirmed} / {m.unitsRequired}</span></div>
                <ProgressBar value={m.unitsConfirmed} max={m.unitsRequired} label="Donors confirmed" />
              </div>
              <dl className="mt-8 space-y-4 text-sm">
                <div className="flex gap-3"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden /><div><dt className="text-muted-foreground">Hospital</dt><dd className="font-medium">{m.hospitalName}</dd><dd className="text-muted-foreground">{[m.district, m.city].filter(Boolean).join(", ")} · {m.distanceKm.toFixed(1)} km from you</dd></div></div>
                <div className="flex gap-3"><Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden /><div><dt className="text-muted-foreground">Needed within</dt><dd className="text-2xl font-semibold"><Countdown deadline={m.deadline} /></dd></div></div>
                {m.description && <div><dt className="text-muted-foreground">Note from the requester</dt><dd className="mt-1 whitespace-pre-wrap">{m.description}</dd></div>}
                {m.contactPhone && <div className="flex gap-3 rounded-xl bg-success/10 p-4"><Phone className="size-4 shrink-0 text-success" aria-hidden /><div><dt className="text-muted-foreground">Contact to coordinate</dt><dd className="text-lg font-semibold"><a href={`tel:${m.contactPhone}`} className="hover:underline">{m.contactPhone}</a></dd></div></div>}
              </dl>

              {open && !closed && (
                <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
                  <Button size="lg" className="flex-1" onClick={accept} disabled={busy !== null}>{busy === "accept" && <Loader2 className="animate-spin" />} {busy === "accept" ? "Sending response…" : "Accept — I can donate"}</Button>
                  <Button size="lg" variant="outline" className="flex-1" onClick={() => setConfirmReject(true)} disabled={busy !== null}>Decline</Button>
                </div>
              )}
              {closed && <p className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">This request is no longer accepting donors.</p>}
              {m.status === "ACCEPTED" && <p className="mt-6 rounded-xl bg-success/10 p-4 text-sm">You accepted this request. Please contact the requester and follow the hospital&apos;s instructions.</p>}
              <div className="mt-6 flex justify-end"><ReportDialog targetType="REQUEST" targetId={m.requestId} /></div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Why this request was matched to you</CardTitle></CardHeader>
              <CardContent>
                {m.explanation ? (
                  <>
                    <ul className="divide-y divide-border">
                      <Row label="Blood compatibility" ok={m.explanation.bloodCompatible} value={m.explanation.exactTypeMatch ? "Same type" : "Compatible"} />
                      <Row label="Distance" ok value={`${m.explanation.distanceKm.toFixed(1)} km`} />
                      <Row label="Availability" ok={m.explanation.available} />
                      <Row label="Deadline feasibility" ok={m.explanation.deadlineFeasible} />
                    </ul>
                    <div className="mt-5 space-y-2">
                      {([["Compatibility", m.explanation.compatibilityScore, "40%"], ["Distance", m.explanation.distanceScore, "25%"], ["Availability", m.explanation.availabilityScore, "15%"], ["Deadline", m.explanation.deadlineScore, "10%"], ["Recency", m.explanation.recencyScore, "10%"]] as const).map(([l, v, w]) => (
                        <div key={l} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-xs"><span className="text-muted-foreground">{l} <span className="opacity-60">({w})</span></span><ProgressBar value={v} max={100} label={`${l} score`} className="h-1.5" /><span className="text-right tabular-nums">{Math.round(v)}</span></div>
                      ))}
                    </div>
                    <p className="mt-6 rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">{m.explanation.disclaimer}</p>
                  </>
                ) : <p className="text-sm text-muted-foreground">Add your location in your profile to see how this match was calculated.</p>}
              </CardContent>
            </Card>
          </div>
        ) : null}

      <ConfirmDialog open={confirmReject} onOpenChange={setConfirmReject} title="Decline this request?" description="Are you sure you want to decline this request? We will not ask you again about it, and the requester will keep looking for other donors." confirmLabel="Yes, decline" destructive onConfirm={reject} />
    </>
  );
}

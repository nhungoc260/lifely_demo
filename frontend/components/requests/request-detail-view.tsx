"use client";

import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Circle, Clock, Loader2, MapPin, Phone, Radio } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { MatchBadge, StatusBadge, UrgencyBadge, BloodChip } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Countdown } from "@/components/ui/countdown";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { useRealtime, useRealtimeStatus } from "@/hooks/use-realtime";
import { toApiError } from "@/lib/api";
import { formatDateTime, STATUS_LABEL, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { orgApi, requestApi } from "@/services";
import type { RequestChangedEvent, RequestStatus } from "@/types/domain";

const FLOW: RequestStatus[] = ["CREATED", "PENDING_VERIFICATION", "VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED", "FULFILLED"];
const CANCELLABLE: RequestStatus[] = ["CREATED", "PENDING_VERIFICATION", "VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"];

function Lifecycle({ status }: { status: RequestStatus }) {
  const terminalBad = status === "CANCELLED" || status === "EXPIRED";
  const idx = FLOW.indexOf(status);
  const steps = terminalBad ? [...FLOW.slice(0, 3), status] : FLOW;
  return (
    <ol className="space-y-3" aria-label="Request lifecycle">
      {steps.map((s, i) => {
        const done = terminalBad ? i < steps.length - 1 : i < idx;
        const current = terminalBad ? i === steps.length - 1 : i === idx;
        return (
          <li key={s} className="flex items-center gap-3 text-sm" aria-current={current ? "step" : undefined}>
            {done ? <CheckCircle2 className="size-5 text-success" aria-hidden /> : current ? (terminalBad ? <AlertTriangle className="size-5 text-critical" aria-hidden /> : <span className="grid size-5 place-items-center"><span className="size-3 rounded-full bg-primary ring-4 ring-primary/20" /></span>) : <Circle className="size-5 text-border" aria-hidden />}
            <span className={cn(current ? "font-semibold" : done ? "" : "text-muted-foreground")}>{STATUS_LABEL[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RequestDetailView({ basePath }: { basePath: "/requester" | "/organization" }) {
  const { id } = useParams<{ id: string }>();
  const live = useRealtimeStatus();
  const req = useQuery(`req:${id}`, () => requestApi.detail(id));
  const hist = useQuery(`req-hist:${id}`, () => requestApi.history(id));
  const matches = useQuery(`req-matches:${id}`, () => requestApi.matches(id));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const r = req.data;

  // Cập nhật realtime: số xác nhận đổi ngay, không cần reload trang.
  useRealtime<RequestChangedEvent>(`/topic/requests/${id}`, (e) => {
    req.mutate((p) => p && { ...p, unitsConfirmed: e.unitsConfirmed, unitsRequired: e.unitsRequired, status: e.status });
    hist.reload();
    matches.reload();
  });

  async function cancel(reason: string) {
    try { const upd = await requestApi.cancel(id, reason || undefined); req.mutate(() => upd); hist.reload(); matches.reload(); toast.success("Request cancelled"); }
    catch (e) { toast.error(toApiError(e).message); throw e; }
  }

  async function complete(matchId: string) {
    setBusy(matchId);
    try { await requestApi.complete(matchId); toast.success("Donation recorded. Thank you!"); matches.reload(); }
    catch (e) { toast.error(toApiError(e).message); } finally { setBusy(null); }
  }

  async function verifyLinked() {
    setBusy("verify");
    try { const upd = await orgApi.verifyRequest(id); req.mutate(() => upd); hist.reload(); toast.success("Request verified. Matching has started."); }
    catch (e) { toast.error(toApiError(e).message); } finally { setBusy(null); }
  }

  return (
    <>
      <Link href={`${basePath}/requests`} className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> My requests</Link>
      {req.initialLoading ? <Skeleton className="h-96" />
        : req.error && !r ? <ErrorState message={req.error.message} onRetry={req.reload} />
        : r ? (
          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2"><UrgencyBadge urgency={r.urgency} /><StatusBadge status={r.status} /></div>
                <span className={cn("inline-flex items-center gap-1.5 text-xs", live === "live" ? "text-success" : "text-muted-foreground")}><Radio className="size-3.5" aria-hidden />{live === "live" ? "Live" : "Reconnecting…"}</span>
              </div>
              <div className="mt-6 grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-4"><BloodChip type={r.bloodType} className="text-2xl" /><h1 className="text-3xl font-semibold tracking-tight">Need {r.unitsRequired} unit{r.unitsRequired === 1 ? "" : "s"}</h1></div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden />{r.hospitalName}{r.district ? `, ${r.district}` : ""}</p>
                </div>
                <div className="flex gap-8">
                  <div><p className="text-xs text-muted-foreground">Confirmed</p><p aria-live="polite" className="text-4xl font-semibold tabular-nums tracking-tight">{r.unitsConfirmed} <span className="text-muted-foreground">/ {r.unitsRequired}</span></p></div>
                  <div><p className="text-xs text-muted-foreground">Time remaining</p><p className="text-4xl font-semibold tracking-tight">{["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.status) ? "–" : <Countdown deadline={r.deadline} />}</p></div>
                </div>
              </div>
              <ProgressBar className="mt-6" value={r.unitsConfirmed} max={r.unitsRequired} label="Donors confirmed" />
              {r.status === "PENDING_VERIFICATION" && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning/10 p-4 text-sm"><p>Waiting for verification. Donors are contacted as soon as the request is verified.</p>
                  {basePath === "/organization" && r.organizationId && <Button size="sm" onClick={verifyLinked} disabled={busy === "verify"}>{busy === "verify" && <Loader2 className="animate-spin" />} Verify this request</Button>}</div>
              )}
              {r.status === "CANCELLED" && r.cancelReason && <p className="mt-6 rounded-xl bg-muted p-4 text-sm">Cancelled: {r.cancelReason}</p>}
              {CANCELLABLE.includes(r.status) && <div className="mt-6 flex justify-end"><Button variant="outline" onClick={() => setCancelOpen(true)}>Cancel request</Button></div>}
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
              <Card>
                <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
                <CardContent><Lifecycle status={r.status} /><p className="mt-5 text-xs text-muted-foreground">Search level {r.escalationLevel} of 4. The search widens automatically if more donors are needed.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Matched donors</CardTitle></CardHeader>
                <CardContent>
                  {matches.initialLoading ? <Skeleton className="h-32" />
                    : matches.data && matches.data.length > 0 ? (
                      <ul className="divide-y divide-border">
                        {matches.data.map((m) => (
                          <li key={m.matchId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                            <div>
                              <p className="font-medium">{m.donorName ?? m.label}</p>
                              <p className="text-xs text-muted-foreground">{m.distanceKm.toFixed(1)} km · {Math.round(m.matchingScore)}%{m.respondedAt ? ` · ${timeAgo(m.respondedAt)}` : ""}</p>
                              {m.donorPhone && <a href={`tel:${m.donorPhone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Phone className="size-3" aria-hidden />{m.donorPhone}</a>}
                            </div>
                            <div className="flex items-center gap-2">
                              <MatchBadge status={m.status} />
                              {m.status === "ACCEPTED" && <Button size="sm" variant="outline" onClick={() => complete(m.matchId)} disabled={busy === m.matchId}>{busy === m.matchId ? <Loader2 className="animate-spin" /> : <Check />} Mark donated</Button>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : <EmptyState title="No donors contacted yet" description="Donors appear here once the request is verified and matching starts." />}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
              <CardContent>
                {hist.data && hist.data.length > 0 ? (
                  <ol className="relative space-y-4 border-l border-border pl-6">
                    {[...hist.data].reverse().map((h, i) => (
                      <li key={`${h.createdAt}-${i}`} className="relative">
                        <span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
                        <p className="text-sm font-medium">{h.note ?? STATUS_LABEL[h.toStatus]}</p>
                        <time dateTime={h.createdAt} className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</time>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
              </CardContent>
            </Card>
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden />Final donation eligibility must be confirmed by healthcare professionals.</p>
          </div>
        ) : null}
      <ConfirmDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel request?" description="Donors who were contacted or accepted will be told this request was cancelled. This cannot be undone." confirmLabel="Cancel request" destructive reasonLabel="Reason (optional)" onConfirm={cancel} />
    </>
  );
}

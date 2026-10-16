"use client";

import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Circle, Clock, Loader2, MapPin, Phone, Radio, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DeliveryCard, FacilityReviewBanner } from "@/components/requests/facility-delivery";
import { ShareRequest } from "@/components/requests/share-request";
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
import { useAuth } from "@/providers/auth-provider";
import { orgApi, requestApi } from "@/services";
import type { RequestChangedEvent, RequestStatus } from "@/types/domain";

const FLOW: RequestStatus[] = ["CREATED", "PENDING_VERIFICATION", "VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED", "FULFILLED"];
const CANCELLABLE: RequestStatus[] = ["CREATED", "PENDING_VERIFICATION", "VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"];

function Lifecycle({ status }: { status: RequestStatus }) {
  const terminalBad = status === "CANCELLED" || status === "EXPIRED";
  const idx = FLOW.indexOf(status);
  const steps = terminalBad ? [...FLOW.slice(0, 3), status] : FLOW;
  return (
    <ol className="space-y-3" aria-label="Vòng đời yêu cầu">
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
  const { user } = useAuth();
  const isOrg = user?.roles.includes("ORGANIZATION") ?? false;
  const r = req.data;

  // Cập nhật realtime: số xác nhận đổi ngay, không cần reload trang.
  useRealtime<RequestChangedEvent>(`/topic/requests/${id}`, (e) => {
    req.mutate((p) => p && { ...p, unitsConfirmed: e.unitsConfirmed, unitsRequired: e.unitsRequired, status: e.status });
    hist.reload();
    matches.reload();
  });

  async function cancel(reason: string) {
    try { const upd = await requestApi.cancel(id, reason || undefined); req.mutate(() => upd); hist.reload(); matches.reload(); toast.success("Đã hủy yêu cầu"); }
    catch (e) { toast.error(toApiError(e).message); throw e; }
  }

  async function complete(matchId: string) {
    setBusy(matchId);
    try { await requestApi.complete(matchId); toast.success("Đã ghi nhận lần hiến máu. Cảm ơn bạn!"); matches.reload(); }
    catch (e) { toast.error(toApiError(e).message); } finally { setBusy(null); }
  }

  async function noShow(matchId: string) {
    setBusy(matchId);
    try { await requestApi.noShow(matchId); toast.success("Đã đóng lượt nhận lời. Chỗ trống được mở lại cho điều phối."); matches.reload(); req.reload(); }
    catch (e) { toast.error(toApiError(e).message); } finally { setBusy(null); }
  }

  async function verifyLinked() {
    setBusy("verify");
    try { const upd = await orgApi.verifyRequest(id); req.mutate(() => upd); hist.reload(); toast.success("Đã xác minh yêu cầu. Hệ thống bắt đầu tìm người hiến máu."); }
    catch (e) { toast.error(toApiError(e).message); } finally { setBusy(null); }
  }

  return (
    <>
      <Link href={`${basePath}/requests`} className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Yêu cầu của tôi</Link>
      {req.initialLoading ? <Skeleton className="h-96" />
        : req.error && !r ? <ErrorState message={req.error.message} onRetry={req.reload} />
        : r ? (
          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2"><UrgencyBadge urgency={r.urgency} /><StatusBadge status={r.status} /></div>
                <span className={cn("inline-flex items-center gap-1.5 text-xs", live === "live" ? "text-success" : "text-muted-foreground")}><Radio className="size-3.5" aria-hidden />{live === "live" ? "Trực tiếp" : "Đang kết nối lại…"}</span>
              </div>
              <div className="mt-6 grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-4"><BloodChip type={r.bloodType} className="text-2xl" /><h1 className="text-3xl font-semibold tracking-tight">Cần {r.unitsRequired} đơn vị</h1></div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden />{r.hospitalName}{r.district ? `, ${r.district}` : ""}</p>
                </div>
                <div className="flex gap-8">
                  <div><p className="text-xs text-muted-foreground">Người nhận lời</p><p aria-live="polite" className="text-4xl font-semibold tabular-nums tracking-tight">{r.unitsConfirmed} <span className="text-muted-foreground">/ {r.unitsRequired}</span></p></div>
                  <div><p className="text-xs text-muted-foreground">Thời gian còn lại</p><p className="text-4xl font-semibold tracking-tight">{["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.status) ? "–" : <Countdown deadline={r.deadline} />}</p></div>
                </div>
              </div>
              <ProgressBar className="mt-6" value={r.unitsConfirmed} max={r.unitsRequired} label="Người hiến máu đã nhận lời (chưa phải lượng máu đã hiến)" />
              <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">Đã được xác nhận hiến thực tế: <span className="font-medium tabular-nums text-foreground">{r.unitsReceived} / {r.unitsRequired}</span> đơn vị. Chỉ cơ sở y tế hoặc bên điều phối ghi nhận con số này.</p>
              {r.status === "PENDING_VERIFICATION" && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning/10 p-4 text-sm"><p>Đang chờ xác minh. Người hiến máu sẽ được liên hệ ngay khi yêu cầu được xác minh.</p>
                  {basePath === "/organization" && r.organizationId && <Button size="sm" onClick={verifyLinked} disabled={busy === "verify"}>{busy === "verify" && <Loader2 className="animate-spin" />} Xác minh yêu cầu này</Button>}</div>
              )}
              <FacilityReviewBanner r={r} isOrg={isOrg && basePath === "/organization"} onUpdated={(u) => { req.mutate(() => u); hist.reload(); matches.reload(); }} />
              {r.status === "CANCELLED" && r.cancelReason && <p className="mt-6 rounded-xl bg-muted p-4 text-sm">Đã hủy: {r.cancelReason}</p>}
              {CANCELLABLE.includes(r.status) && <div className="mt-6 flex justify-end"><Button variant="outline" onClick={() => setCancelOpen(true)}>Hủy yêu cầu</Button></div>}
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
              <Card>
                <CardHeader><CardTitle>Tiến độ</CardTitle></CardHeader>
                <CardContent><Lifecycle status={r.status} /><p className="mt-5 text-xs text-muted-foreground">Cấp tìm kiếm {r.escalationLevel} trên 4. Phạm vi tìm kiếm tự động mở rộng nếu cần thêm người hiến máu.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Người hiến máu được kết nối</CardTitle></CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">Người nhà đánh dấu đã hiến sẽ được ghi nhận ở mức “Người nhà xác nhận”. Mức “Cơ sở y tế xác nhận” chỉ dành cho tổ chức y tế đã được quản trị viên xác minh.</p>
                  {matches.initialLoading ? <Skeleton className="h-32" />
                    : matches.data && matches.data.length > 0 ? (
                      <ul className="divide-y divide-border">
                        {matches.data.map((m) => (
                          <li key={m.matchId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                            <div>
                              <p className="font-medium">{m.donorName ?? m.label}</p>
                              <p className="text-xs text-muted-foreground">{m.distanceKm.toFixed(1)} km · {Math.round(m.matchingScore)}%{m.respondedAt ? ` · ${timeAgo(m.respondedAt)}` : ""}</p>
                              {m.facilityVerified && (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                  <ShieldCheck className="size-3" aria-hidden />Đã được {m.verifiedByName ?? "cơ sở y tế"} xác nhận hiến máu
                                </p>
                              )}
                              {m.donorPhone && <a href={`tel:${m.donorPhone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Phone className="size-3" aria-hidden />{m.donorPhone}</a>}
                            </div>
                            <div className="flex items-center gap-2">
                              <MatchBadge status={m.status} />
                              {m.status === "ACCEPTED" && <Button size="sm" variant="outline" onClick={() => complete(m.matchId)} disabled={busy === m.matchId}>{busy === m.matchId ? <Loader2 className="animate-spin" /> : <Check />} {isOrg ? "Xác nhận đã hiến (cơ sở y tế)" : "Đánh dấu đã hiến"}</Button>}
                              {m.status === "ACCEPTED" && <Button size="sm" variant="ghost" onClick={() => noShow(m.matchId)} disabled={busy === m.matchId}>Không đến</Button>}
                              {m.status === "COMPLETED" && isOrg && <Button size="sm" variant="ghost" onClick={() => complete(m.matchId)} disabled={busy === m.matchId}>{busy === m.matchId ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Xác nhận với tư cách cơ sở y tế</Button>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : <EmptyState title="Chưa liên hệ người hiến máu nào" description="Người hiến máu sẽ hiện ở đây khi yêu cầu được xác minh và bắt đầu tìm kiếm." />}
                </CardContent>
              </Card>
            </div>

            <DeliveryCard requestId={r.id} canRetry={isOrg} />

            <ShareRequest r={r} />

            <Card>
              <CardHeader><CardTitle>Hoạt động</CardTitle></CardHeader>
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
                ) : <p className="text-sm text-muted-foreground">Chưa có hoạt động.</p>}
              </CardContent>
            </Card>
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden />Điều kiện hiến máu cuối cùng phải do nhân viên y tế xác nhận.</p>
          </div>
        ) : null}
      <ConfirmDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Hủy yêu cầu?" description="Những người hiến máu đã được liên hệ hoặc đã nhận lời sẽ được báo là yêu cầu đã bị hủy. Không thể hoàn tác." confirmLabel="Hủy yêu cầu" destructive reasonLabel="Lý do (không bắt buộc)" onConfirm={cancel} />
    </>
  );
}

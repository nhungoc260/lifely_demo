"use client";

import { BellRing, Building2, Loader2, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { deliveryApi, requestApi } from "@/services";
import type { BloodRequest } from "@/types/domain";

/** Yêu cầu gắn với cơ sở được huy động ngay; cơ sở xác nhận hoặc từ chối (từ chối dừng toàn bộ lời mời). */
export function FacilityReviewBanner({ r, isOrg, onUpdated }: { r: BloodRequest; isOrg: boolean; onUpdated: (u: BloodRequest) => void }) {
  const [busy, setBusy] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  if (r.facilityReview !== "PENDING") return null;

  async function confirm() {
    setBusy(true);
    try { onUpdated(await requestApi.facilityConfirm(r.id)); toast.success("Đã xác nhận yêu cầu"); }
    catch (e) { toast.error(toApiError(e).message); }
    finally { setBusy(false); }
  }
  async function deny(reason: string) {
    try { onUpdated(await requestApi.facilityDeny(r.id, reason || undefined)); toast.success("Đã từ chối và dừng huy động"); }
    catch (e) { toast.error(toApiError(e).message); }
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning/10 p-4 text-sm" role="status">
      <p className="flex items-start gap-2"><Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
        {isOrg
          ? "Yêu cầu này gắn với cơ sở của bạn và đang được huy động. Hãy xác nhận đây là nhu cầu thật, hoặc từ chối để dừng gửi lời mời ngay."
          : "Yêu cầu đã được tiếp nhận và đang tìm người hiến máu. Cơ sở y tế đã được báo để xác nhận. Việc có máu hay không do cơ sở y tế quyết định."}
      </p>
      {isOrg && (
        <div className="flex gap-2">
          <Button size="sm" onClick={confirm} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Xác nhận yêu cầu</Button>
          <Button size="sm" variant="outline" onClick={() => setDenyOpen(true)}>Không phải của cơ sở</Button>
        </div>
      )}
      <ConfirmDialog open={denyOpen} onOpenChange={setDenyOpen} title="Từ chối yêu cầu này?"
        description="Yêu cầu sẽ bị hủy, mọi lời mời chưa gửi bị dừng và người hiến đã được mời sẽ được báo."
        confirmLabel="Từ chối và dừng huy động" destructive reasonLabel="Lý do (tuỳ chọn)" onConfirm={deny} />
    </div>
  );
}

const RESPONSE_LABEL: Record<string, string> = {
  CONTACTED: "Đã được mời", VIEWED: "Đã xem", ACCEPTED: "Đã nhận lời", REJECTED: "Từ chối", EXPIRED: "Hết hiệu lực",
  COMPLETED: "Đã hiến (có xác nhận)", CANCELLED: "Đã đóng", PENDING: "Chờ",
};
const OUTBOX_LABEL: Record<string, string> = {
  PENDING: "chờ gửi", SENDING: "đang gửi", SENT: "đã gửi", FAILED: "lỗi", CANCELLED: "đã hủy",
};
// Lý do tin bị hủy/lỗi, diễn đạt cho người dùng (không phải mã kỹ thuật).
const REASON_LABEL: Record<string, string> = {
  NO_SUBSCRIPTION: "người nhận chưa bật thông báo đẩy trên thiết bị",
  CONSENT_REVOKED: "người nhận không đồng ý kênh này",
  CHANNEL_DISABLED: "kênh đang tắt",
  USER_INACTIVE: "tài khoản người nhận không hoạt động",
  NO_PHONE: "người nhận chưa có số điện thoại",
  REQUEST_CLOSED: "yêu cầu đã đóng",
};
function outboxText(o: { channel: string; status: string; reason: string | null }, d: { smsMock: boolean }) {
  const name = o.channel === "SMS" ? (d.smsMock ? "SMS (giả lập, không gửi thật)" : "SMS") : o.channel === "PUSH" ? "Thông báo đẩy" : "Kênh cũ (đã ngừng)";
  const status = OUTBOX_LABEL[o.status] ?? o.status;
  const reason = o.reason ? REASON_LABEL[o.reason] ?? o.reason : null;
  return `${name} · ${status}${reason && (o.status === "CANCELLED" || o.status === "FAILED") ? `: ${reason}` : ""}`;
}

/** Theo dõi phản hồi của người hiến và tình trạng phát SMS/cuộc gọi. Không hiển thị số điện thoại hay danh tính. */
export function DeliveryCard({ requestId, canRetry, canRemind = false }: { requestId: string; canRetry: boolean; canRemind?: boolean }) {
  const q = useQuery(`req-delivery:${requestId}`, () => deliveryApi.summary(requestId));
  const [busy, setBusy] = useState(false);
  const [reminding, setReminding] = useState(false);
  const d = q.data;
  // Người hiến đã được mời nhưng chưa phản hồi (chưa nhận lời / từ chối).
  const waiting = (d?.responses.CONTACTED ?? 0) + (d?.responses.PENDING ?? 0);

  async function remind() {
    setReminding(true);
    try {
      const res = await deliveryApi.remind(requestId);
      toast.success(res.reminded > 0 ? `Đã nhắc lại ${res.reminded} người hiến chưa phản hồi` : "Không có người hiến nào cần nhắc");
      q.reload();
    } catch (e) { toast.error(toApiError(e).message); }
    finally { setReminding(false); }
  }

  async function retry() {
    setBusy(true);
    try {
      const res = await deliveryApi.retry(requestId);
      toast.success(res.requeued > 0 ? `Đã xếp lại ${res.requeued} thông báo lỗi` : "Không có thông báo nào cần xếp lại");
      q.reload();
    } catch (e) { toast.error(toApiError(e).message); }
    finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Send className="size-4" aria-hidden />Phản hồi và thông báo</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        {q.initialLoading || !d ? <Skeleton className="h-20" /> : (
          <>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Phản hồi của người hiến máu</p>
              {Object.keys(d.responses).length === 0 ? <p className="text-muted-foreground">Chưa có người hiến máu nào được mời.</p> : (
                <ul className="flex flex-wrap gap-2">
                  {Object.entries(d.responses).map(([k, n]) => (
                    <li key={k} className="rounded-full bg-muted px-3 py-1 text-xs"><span className="font-medium tabular-nums">{n}</span> {RESPONSE_LABEL[k] ?? k}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Thông báo đã gửi</p>
              <ul className="space-y-1">
                <li className="flex justify-between">
                  <span>Thông báo trong ứng dụng</span>
                  <span className="font-medium tabular-nums">{d.inApp} người</span>
                </li>
                {d.outbox.map((o) => (
                  <li key={`${o.channel}-${o.status}-${o.reason ?? ""}`} className="flex justify-between gap-3"><span>{outboxText(o, d)}</span><span className="font-medium tabular-nums">{o.total}</span></li>
                ))}
              </ul>
              {d.outbox.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {!d.smsEnabled && !d.pushEnabled
                    ? "SMS và thông báo đẩy đang tắt trên hệ thống. Người hiến nhận thông báo trong ứng dụng."
                    : "Chưa có tin SMS/thông báo đẩy nào được xếp hàng (người nhận chưa đồng ý kênh này)."}
                </p>
              )}
              {canRemind && waiting > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={remind} disabled={reminding}>{reminding ? <Loader2 className="animate-spin" /> : <BellRing />} Nhắc lại {waiting} người chưa phản hồi</Button>
                  <span className="text-xs text-muted-foreground">Gửi lại thông báo cho người đã được mời. Có thể nhắc mỗi 10 phút một lần.</span>
                </div>
              )}
              {d.failed > 0 && canRetry && (
                <Button size="sm" variant="outline" className="mt-3" onClick={retry} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Thử gửi lại {d.failed} tin lỗi</Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

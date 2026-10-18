"use client";

import { Loader2, Phone, PhoneOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { toApiError } from "@/lib/api";
import { telHref } from "@/lib/phone";
import { requestApi } from "@/services";
import type { ContactResult, RequestMatchEntry } from "@/types/domain";

export const CONTACT_LABEL: Record<ContactResult, string> = {
  NOT_CONTACTED: "Chưa liên hệ",
  CONTACTED: "Đã liên hệ",
  UNREACHABLE: "Không liên lạc được",
  CONFIRMED_CAN_JOIN: "Xác nhận có thể tham gia",
  CANNOT_JOIN: "Không thể tham gia",
};

export const CONTACT_TONE: Record<ContactResult, "slate" | "blue" | "amber" | "green" | "red"> = {
  NOT_CONTACTED: "slate", CONTACTED: "blue", UNREACHABLE: "amber", CONFIRMED_CAN_JOIN: "green", CANNOT_JOIN: "red",
};

const ORDER: ContactResult[] = ["NOT_CONTACTED", "CONTACTED", "UNREACHABLE", "CONFIRMED_CAN_JOIN", "CANNOT_JOIN"];

/**
 * Nút "Gọi người hiến" (liên kết tel:, mở ứng dụng gọi điện của thiết bị) + ô ghi nhận kết quả do nhân viên tự chọn.
 * Việc bấm gọi KHÔNG đổi trạng thái nào; chỉ khi nhân viên chọn kết quả thì mới gửi lên máy chủ.
 * Số điện thoại chỉ có khi người hiến đã nhận lời và người xem có quyền (máy chủ quyết định, không phải giao diện).
 */
export function CallDonor({ m, onChanged }: { m: RequestMatchEntry; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const href = telHref(m.donorPhone);
  const callable = m.status === "ACCEPTED" || m.status === "COMPLETED";
  if (!callable) return null;

  async function record(result: ContactResult) {
    setBusy(true);
    try {
      await requestApi.contactResult(m.matchId, result);
      toast.success("Đã ghi nhận kết quả liên hệ");
      onChanged();
    } catch (e) { toast.error(toApiError(e).message); } finally { setBusy(false); }
  }

  return (
    <div className="mt-2 space-y-2">
      {href ? (
        <a href={href} aria-label={`Gọi người hiến ${m.donorName ?? ""}`.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <Phone className="size-4" aria-hidden />Gọi người hiến
          <span className="font-normal opacity-90">{m.donorPhone}</span>
        </a>
      ) : (
        <p role="status" className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <PhoneOff className="size-4" aria-hidden />Người hiến chưa có số điện thoại hợp lệ nên chưa thể gọi.
        </p>
      )}
      <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Kết quả liên hệ (bạn tự ghi nhận):</span>
        <select value={m.contactResult} disabled={busy} onChange={(e) => record(e.target.value as ContactResult)}
          className="min-h-9 rounded-lg border border-border bg-background px-2 text-foreground">
          {ORDER.map((r) => <option key={r} value={r}>{CONTACT_LABEL[r]}</option>)}
        </select>
        {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      </label>
    </div>
  );
}

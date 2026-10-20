"use client";

import { CalendarCheck, CalendarX2, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apptPayload, QrCode } from "@/components/appointments/qr-code";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { APPOINTMENT_STATUS_LABEL, formatSlotRange } from "@/lib/appointments";
import { formatDateTime } from "@/lib/format";
import { appointmentApi } from "@/services";

export default function DonorAppointments() {
  const slots = useQuery("slots-open", () => appointmentApi.slots({ days: 30 }));
  const mine = useQuery("appointments-mine", appointmentApi.mine);
  const [busy, setBusy] = useState<string | null>(null);

  async function book(id: string) {
    setBusy(id);
    try {
      await appointmentApi.book(id);
      toast.success("Đã đặt lịch. Đây là lịch hẹn, cơ sở y tế sẽ sàng lọc khi bạn đến.");
    } catch (e) {
      // Hết chỗ do người khác đặt trước: báo rõ và tải lại danh sách để chọn khung giờ khác.
      toast.error(toApiError(e).message);
    } finally { setBusy(null); slots.reload(); mine.reload(); }
  }

  async function cancel(id: string) {
    setBusy(id);
    try { await appointmentApi.cancel(id); toast.success("Đã hủy lịch hẹn"); }
    catch (e) { toast.error(toApiError(e).message); }
    finally { setBusy(null); slots.reload(); mine.reload(); }
  }

  const upcoming = mine.data?.filter((a) => ["BOOKED", "CHECKED_IN", "SCREENED"].includes(a.status)) ?? [];
  const past = mine.data?.filter((a) => !["BOOKED", "CHECKED_IN", "SCREENED"].includes(a.status)) ?? [];

  return (
    <>
      <PageHeader title="Lịch hiến máu" description="Đặt lịch trước tại cơ sở y tế đã xác minh. Lịch hẹn chỉ giữ chỗ cho bạn, chưa phải xác nhận đủ điều kiện hiến máu và chưa được tính vào kho máu." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Khung giờ còn nhận lịch</CardTitle></CardHeader>
          <CardContent>
            {slots.initialLoading ? <Skeleton className="h-48" />
              : slots.error && !slots.data ? <ErrorState message={slots.error.message} onRetry={slots.reload} />
              : slots.data && slots.data.length === 0 ? <EmptyState title="Chưa có khung giờ nào" description="Các cơ sở sẽ mở thêm lịch. Bạn vẫn có thể phản hồi các yêu cầu máu khẩn cấp gần bạn." />
              : (
                <ul className="-mx-1 divide-y divide-border/60">
                  {slots.data?.map((s) => {
                    const st = new Date(s.startsAt);
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-1 py-3 text-sm">
                        <span className="grid size-12 shrink-0 place-content-center rounded-2xl bg-sky-500/10 text-center text-sky-600 dark:text-sky-400">
                          <span className="text-lg font-bold leading-none tabular-nums">{String(st.getDate()).padStart(2, "0")}</span>
                          <span className="mt-0.5 text-[10px] font-semibold uppercase">Th{st.getMonth() + 1}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{formatSlotRange(s.startsAt, s.endsAt)}</p>
                          <p className="truncate text-xs font-medium">{s.organizationName}</p>
                          {(s.address || s.city) && <p className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="mt-0.5 size-3 shrink-0" aria-hidden /><span className="line-clamp-2 min-w-0 break-words">{s.address ?? s.city}</span></p>}
                          <p className={s.available === 0 ? "text-xs font-medium text-critical" : "text-xs text-muted-foreground"}>
                            {s.available === 0 ? "Đã hết chỗ" : `Còn ${s.available} / ${s.capacity} chỗ`}
                          </p>
                        </div>
                        <Button size="sm" className="press shrink-0" onClick={() => book(s.id)} disabled={s.available === 0 || busy === s.id}>
                          {busy === s.id ? <Loader2 className="animate-spin" /> : <CalendarCheck />} Đặt
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </CardContent>
        </Card>

        <Card className="min-w-0 max-lg:order-first">
          <CardHeader><CardTitle>Lịch của tôi</CardTitle></CardHeader>
          <CardContent>
            {mine.initialLoading ? <Skeleton className="h-32" />
              : mine.error && !mine.data ? <ErrorState message={mine.error.message} onRetry={mine.reload} />
              : upcoming.length === 0 && past.length === 0 ? <EmptyState title="Bạn chưa đặt lịch nào" description="Chọn một khung giờ ở bên cạnh để đặt lịch." />
              : (
                <div className="space-y-5">
                  {upcoming.length > 0 && (
                    <ul className="space-y-3">
                      {upcoming.map((a) => (
                        <li key={a.id} className="rounded-2xl bg-muted/60 p-3.5 text-sm ring-1 ring-border/60">
                          <p className="font-medium">{formatDateTime(a.startsAt)}</p>
                          <p className="text-xs text-muted-foreground">{a.organizationName}{a.address ? ` · ${a.address}` : ""}</p>
                          <p className="mt-1 text-xs">{APPOINTMENT_STATUS_LABEL[a.status]}</p>
                          {(a.status === "BOOKED" || a.status === "CHECKED_IN") && (
                            <details className="mt-2 rounded-xl bg-card px-3 py-2 ring-1 ring-border/60">
                              <summary className="cursor-pointer text-xs font-medium text-primary">Mã QR check-in</summary>
                              <div className="mt-2 flex flex-col items-center gap-1"><QrCode value={apptPayload(a.id)} label="Mã QR check-in lịch hẹn" /><p className="text-center text-xs text-muted-foreground">Đưa mã này cho nhân viên cơ sở khi đến hiến máu.</p></div>
                            </details>
                          )}
                          {a.status === "BOOKED" && (
                            <div className="mt-2 flex items-center gap-3">
                              <Button size="sm" variant="outline" onClick={() => cancel(a.id)} disabled={!a.canCancel || busy === a.id}>
                                {busy === a.id ? <Loader2 className="animate-spin" /> : <CalendarX2 />} Hủy lịch
                              </Button>
                              {!a.canCancel && <span className="text-xs text-muted-foreground">Chỉ hủy được trước giờ hẹn 2 giờ. Để đổi lịch: hủy rồi đặt khung giờ khác.</span>}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {past.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Đã kết thúc</p>
                      <ul className="space-y-1 text-sm">
                        {past.map((a) => <li key={a.id} className="flex justify-between gap-3"><span>{formatDateTime(a.startsAt)} · {a.organizationName}</span><span className="text-muted-foreground">{APPOINTMENT_STATUS_LABEL[a.status]}</span></li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

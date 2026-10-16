"use client";

import { CalendarCheck, CalendarX2, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Khung giờ còn nhận lịch</CardTitle></CardHeader>
          <CardContent>
            {slots.initialLoading ? <Skeleton className="h-48" />
              : slots.error && !slots.data ? <ErrorState message={slots.error.message} onRetry={slots.reload} />
              : slots.data && slots.data.length === 0 ? <EmptyState title="Chưa có khung giờ nào" description="Các cơ sở sẽ mở thêm lịch. Bạn vẫn có thể phản hồi các yêu cầu máu khẩn cấp gần bạn." />
              : (
                <ul className="divide-y divide-border">
                  {slots.data?.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div>
                        <p className="font-medium">{formatSlotRange(s.startsAt, s.endsAt)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden />{s.organizationName}{s.city ? `, ${s.city}` : ""}</p>
                        <p className={s.available === 0 ? "text-xs font-medium text-critical" : "text-xs text-muted-foreground"}>
                          {s.available === 0 ? "Đã hết chỗ" : `Còn ${s.available} / ${s.capacity} chỗ`}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => book(s.id)} disabled={s.available === 0 || busy === s.id}>
                        {busy === s.id ? <Loader2 className="animate-spin" /> : <CalendarCheck />} Đặt lịch
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
          </CardContent>
        </Card>

        <Card>
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
                        <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
                          <p className="font-medium">{formatDateTime(a.startsAt)}</p>
                          <p className="text-xs text-muted-foreground">{a.organizationName}{a.address ? ` · ${a.address}` : ""}</p>
                          <p className="mt-1 text-xs">{APPOINTMENT_STATUS_LABEL[a.status]}</p>
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

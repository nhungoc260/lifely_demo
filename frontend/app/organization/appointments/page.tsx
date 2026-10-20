"use client";

import { Loader2, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { QrCheckIn } from "@/components/appointments/qr-checkin";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { APPOINTMENT_STATUS_LABEL, formatSlotRange, ORG_ACTIONS } from "@/lib/appointments";
import { appointmentApi, orgApi } from "@/services";
import type { AppointmentAction, DonationSlot } from "@/types/domain";

function SlotAppointments({ slot, onChanged }: { slot: DonationSlot; onChanged: () => void }) {
  const q = useQuery(`org-appts:${slot.id}`, () => appointmentApi.orgAppointments(slot.id));
  const [busy, setBusy] = useState<string | null>(null);
  const [donatedFor, setDonatedFor] = useState<string | null>(null);

  async function act(id: string, action: AppointmentAction) {
    setBusy(id + action);
    try { await appointmentApi.transition(id, action); toast.success("Đã cập nhật lịch hẹn"); q.reload(); onChanged(); }
    catch (e) { toast.error(toApiError(e).message); q.reload(); }
    finally { setBusy(null); }
  }

  if (q.initialLoading) return <Skeleton className="mt-3 h-16" />;
  if (!q.data || q.data.length === 0) return <p className="mt-3 text-xs text-muted-foreground">Chưa có ai đặt khung giờ này.</p>;
  return (
    <>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border text-sm">
        {q.data.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium">{a.donorName}{a.bloodType ? ` · ${a.bloodType}` : ""}</p>
              <p className="text-xs text-muted-foreground">{APPOINTMENT_STATUS_LABEL[a.status]}</p>
            </div>
            <div className="flex gap-2">
              {ORG_ACTIONS[a.status].map((o) => (
                <Button key={o.action} size="sm" variant={o.action === "DONATED" ? "default" : "outline"} disabled={busy !== null}
                  onClick={() => (o.action === "DONATED" ? setDonatedFor(a.id) : act(a.id, o.action))}>
                  {busy === a.id + o.action && <Loader2 className="animate-spin" />} {o.label}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={donatedFor !== null} onOpenChange={(o) => !o && setDonatedFor(null)} title="Xác nhận người hiến đã hiến máu?"
        description="Chỉ xác nhận sau khi việc hiến máu thực tế đã hoàn tất tại cơ sở. Hệ thống sẽ ghi lịch sử hiến, cập nhật hồ sơ người hiến và (nếu cơ sở bật tự cộng kho) cộng 1 đơn vị vào kho."
        confirmLabel="Xác nhận đã hiến" onConfirm={async () => { const id = donatedFor; setDonatedFor(null); if (id) await act(id, "DONATED"); }} />
    </>
  );
}

/** Đổi địa điểm hiến máu của một khung giờ (hoặc mọi khung giờ sắp tới). Người đã đặt lịch được thông báo tự động. */
function ChangeLocation({ slot, defaultPlace, onDone, onCancel }: { slot: DonationSlot; defaultPlace: string; onDone: () => void; onCancel: () => void }) {
  const [loc, setLoc] = useState(slot.address ?? defaultPlace);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const clean = loc.trim();
  const unchanged = clean === (slot.address ?? "").trim();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (clean.length < 3 || unchanged) return;
    setBusy(true);
    try {
      const r = await appointmentApi.changeSlotLocation(slot.id, { location: clean, allUpcoming: all });
      toast.success(`Đã đổi địa điểm cho ${r.updatedSlots} khung giờ${r.notifiedDonors > 0 ? `, đã thông báo ${r.notifiedDonors} người đã đặt lịch` : ""}.`);
      onDone();
    } catch (err) { toast.error(toApiError(err).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-3 rounded-xl border border-border bg-muted/40 p-3">
      <Field label="Địa điểm hiến máu mới" htmlFor={`loc-${slot.id}`} hint="Ghi rõ số nhà, đường, quận để người hiến tìm đúng chỗ.">
        <Input id={`loc-${slot.id}`} value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={300} required minLength={3} />
      </Field>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" className="mt-0.5" checked={all} onChange={(e) => setAll(e.target.checked)} />
        <span>Áp dụng cho <strong>mọi khung giờ sắp tới</strong> còn mở của cơ sở (dùng khi cơ sở chuyển địa điểm).</span>
      </label>
      <p className="text-xs text-muted-foreground">Người đã đặt lịch sẽ nhận thông báo về địa điểm mới và vẫn hủy được lịch nếu không tiện đi.</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || clean.length < 3 || unchanged}>{busy && <Loader2 className="animate-spin" />} Lưu và thông báo</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
      </div>
    </form>
  );
}

export default function OrgAppointments() {
  const slots = useQuery("org-slots", appointmentApi.orgSlots);
  const me = useQuery("org-me", orgApi.me);
  const place = [me.data?.address, me.data?.city].filter(Boolean).join(", ");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState(5);
  const [location, setLocation] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return;
    setBusy(true);
    try {
      await appointmentApi.createSlot({ startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), capacity, location: location.trim() || undefined });
      toast.success("Đã mở khung giờ");
      setStart(""); setEnd("");
      slots.reload();
    } catch (err) { toast.error(toApiError(err).message); } finally { setBusy(false); }
  }

  async function close(id: string) {
    try { await appointmentApi.closeSlot(id); toast.success("Đã đóng khung giờ. Các lịch đã đặt vẫn được xử lý."); slots.reload(); }
    catch (err) { toast.error(toApiError(err).message); }
  }

  return (
    <>
      <PageHeader title="Lịch hiến máu của cơ sở" description="Mở khung giờ, theo dõi người đã đặt và ghi nhận kết quả tiếp nhận. Kho máu chỉ tăng khi bạn xác nhận người hiến đã hiến thực tế." />
      <QrCheckIn onDone={() => { setTick((t) => t + 1); slots.reload(); }} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {slots.initialLoading ? <Skeleton className="h-64" />
            : slots.error && !slots.data ? <ErrorState message={slots.error.message} onRetry={slots.reload} />
            : slots.data && slots.data.length === 0 ? <EmptyState title="Chưa có khung giờ nào" description="Hãy mở khung giờ đầu tiên ở biểu mẫu bên cạnh. Chỉ tổ chức đã được xác minh mới mở được lịch." />
            : slots.data?.map((s) => (
              <Card key={s.id}>
                <CardContent className="space-y-1 pt-6 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{formatSlotRange(s.startsAt, s.endsAt)}</p>
                    <span className="text-xs text-muted-foreground">{s.status === "CLOSED" ? "Đã đóng · " : ""}{s.bookedCount} / {s.capacity} chỗ đã đặt</span>
                  </div>
                  {(s.address || s.city) && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden />Địa điểm: {s.address ?? s.city}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Ẩn danh sách" : "Xem người đặt"}</Button>
                    {s.status === "ACTIVE" && new Date(s.startsAt) > new Date() && <Button size="sm" variant="outline" onClick={() => setEditing(editing === s.id ? null : s.id)}>Đổi địa điểm</Button>}
                    {s.status === "ACTIVE" && <Button size="sm" variant="ghost" onClick={() => close(s.id)}>Đóng khung giờ</Button>}
                  </div>
                  {editing === s.id && <ChangeLocation slot={s} defaultPlace={me.data?.address ?? ""} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); slots.reload(); }} />}
                  {open === s.id && <SlotAppointments key={`${s.id}:${tick}`} slot={s} onChanged={slots.reload} />}
                </CardContent>
              </Card>
            ))}
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>Mở khung giờ mới</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4">
              <Field label="Địa điểm hiến máu" htmlFor="slot-loc" hint="Để trống để dùng địa chỉ của cơ sở. Nhập địa chỉ khác nếu khung giờ này diễn ra ở nơi khác (chi nhánh, điểm hiến lưu động). Người hiến thấy địa điểm này khi đặt lịch.">
                <Input id="slot-loc" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} placeholder={place || "Địa chỉ của cơ sở"} />
              </Field>
              <Field label="Bắt đầu" htmlFor="slot-start"><Input id="slot-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
              <Field label="Kết thúc" htmlFor="slot-end"><Input id="slot-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required /></Field>
              <Field label="Sức chứa (số người)" htmlFor="slot-cap" hint="Hệ thống không bao giờ nhận quá số chỗ này, kể cả khi nhiều người đặt cùng lúc."><Input id="slot-cap" type="number" min={1} max={500} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required /></Field>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} Mở khung giờ</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

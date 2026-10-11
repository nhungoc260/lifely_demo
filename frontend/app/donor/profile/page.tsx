"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AccountDataCard } from "@/components/account/account-data-card";
import { ReadinessCard } from "@/components/donor/readiness-card";
import { LocationPicker } from "@/components/map/location-picker";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { donorApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";
import { BLOOD_TYPES, type DonorProfile, type Privacy } from "@/types/domain";

const schema = z.object({
  fullName: z.string().trim().min(2, "Nhập họ và tên"),
  phone: z.string().regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  bloodType: z.string().min(1, "Chọn nhóm máu của bạn"),
  city: z.string().trim().min(1, "Nhập thành phố"),
  district: z.string().trim().min(1, "Nhập quận/huyện"),
  latitude: z.number({ message: "Chọn khu vực của bạn trên bản đồ" }),
  longitude: z.number({ message: "Chọn khu vực của bạn trên bản đồ" }),
  lastDonationDate: z.string(),
});
type Values = z.infer<typeof schema>;

function ProfileForm({ profile, privacy }: { profile: DonorProfile; privacy: Privacy }) {
  const { refresh } = useAuth();
  const [priv, setPriv] = useState(privacy);
  const [avail, setAvail] = useState(profile.availability === "AVAILABLE");
  const { register, handleSubmit, setValue, setError, control, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile.fullName, phone: profile.phone, bloodType: profile.bloodType ?? "", city: profile.city ?? "", district: profile.district ?? "",
      latitude: profile.latitude ?? undefined, longitude: profile.longitude ?? undefined, lastDonationDate: profile.lastDonationDate ?? "",
    },
  });
  const lat = useWatch({ control, name: "latitude" });
  const lng = useWatch({ control, name: "longitude" });

  async function save(v: Values) {
    try {
      await donorApi.update({ ...v, lastDonationDate: v.lastDonationDate || undefined });
      refresh();
      toast.success("Đã cập nhật hồ sơ");
    } catch (e) {
      if (!applyServerErrors(e, setError)) toast.error(toApiError(e).message);
    }
  }

  async function togglePriv(key: keyof Privacy, value: boolean) {
    const next = { ...priv, [key]: value };
    setPriv(next);
    try { await donorApi.updatePrivacy(next); toast.success("Đã lưu cài đặt riêng tư"); }
    catch (e) { setPriv(priv); toast.error(toApiError(e).message); }
  }

  async function toggleAvail(value: boolean) {
    setAvail(value);
    try { await donorApi.setAvailability(value ? "AVAILABLE" : "NOT_AVAILABLE"); toast.success(value ? "Bạn đang sẵn sàng hiến máu" : "Đã tắt trạng thái sẵn sàng"); }
    catch (e) { setAvail(!value); toast.error(toApiError(e).message); }
  }

  return (
    <div className="space-y-6">
    <ReadinessCard lastDonationDate={profile.lastDonationDate} totalDonations={profile.totalDonations} />
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={handleSubmit(save)} noValidate className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Thông tin cá nhân</CardTitle></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="Họ và tên" htmlFor="fullName" error={errors.fullName?.message}><Input id="fullName" {...register("fullName")} aria-invalid={!!errors.fullName} /></Field>
            <Field label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}><Input id="phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} /></Field>
            <Field label="Nhóm máu" htmlFor="bloodType" error={errors.bloodType?.message}>
              <Select id="bloodType" {...register("bloodType")} aria-invalid={!!errors.bloodType}><option value="">Chọn…</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</Select>
            </Field>
            <Field label="Ngày hiến máu gần nhất" htmlFor="last" error={errors.lastDonationDate?.message}><Input id="last" type="date" max={new Date().toISOString().slice(0, 10)} {...register("lastDonationDate")} /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Địa điểm</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Thành phố" htmlFor="city" error={errors.city?.message}><Input id="city" {...register("city")} aria-invalid={!!errors.city} /></Field>
              <Field label="Quận/Huyện" htmlFor="district" error={errors.district?.message}><Input id="district" {...register("district")} aria-invalid={!!errors.district} /></Field>
            </div>
            <LocationPicker latitude={lat ?? null} longitude={lng ?? null} onChange={(a, b) => { setValue("latitude", a, { shouldDirty: true, shouldValidate: true }); setValue("longitude", b, { shouldDirty: true, shouldValidate: true }); }} help="Vị trí chính xác của bạn không bao giờ hiển thị cho ai. Người khác chỉ thấy quận/huyện." />
            {(errors.latitude || errors.longitude) && <p role="alert" className="text-sm text-critical">Chọn khu vực của bạn trên bản đồ</p>}
          </CardContent>
        </Card>
        <div className="flex justify-end"><Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting && <Loader2 className="animate-spin" />} {isSubmitting ? "Đang cập nhật hồ sơ…" : "Lưu thay đổi"}</Button></div>
      </form>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Trạng thái sẵn sàng</CardTitle></CardHeader>
          <CardContent>
            <label className="flex items-center justify-between gap-4"><span className="text-sm"><span className="block font-medium">{avail ? "Sẵn sàng" : "Chưa sẵn sàng"}</span><span className="text-muted-foreground">Khi tắt, bạn sẽ không được kết nối.</span></span><Switch checked={avail} onCheckedChange={toggleAvail} aria-label="Sẵn sàng hiến máu" /></label>
            <p className="mt-4 text-sm text-muted-foreground">Tổng số lần hiến: <span className="font-medium text-foreground">{profile.totalDonations}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quyền riêng tư</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {([
              ["showApproximateLocation", "Hiển thị khu vực gần đúng"],
              ["allowEmergencyMatching", "Cho phép kết nối khẩn cấp"],
              ["receiveEmergencyNotifications", "Nhận thông báo khẩn cấp"],
              ["showDonationCount", "Hiển thị số lần hiến"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><Switch checked={priv[k]} onCheckedChange={(v) => togglePriv(k, v)} aria-label={label} /></label>
            ))}
            <p className="text-xs text-muted-foreground">Vị trí chính xác và số điện thoại không bao giờ được công khai.</p>
          </CardContent>
        </Card>
        <AccountDataCard />
      </div>
    </div>
    </div>
  );
}

export default function DonorProfilePage() {
  const profile = useQuery("donor-profile", donorApi.me);
  const privacy = useQuery("donor-privacy", donorApi.privacy);
  return (
    <>
      <PageHeader title="Hồ sơ" description="Hãy giữ thông tin luôn cập nhật để LIFELY kết nối chính xác cho bạn." />
      {profile.error ? <ErrorState message={profile.error.message} onRetry={profile.reload} />
        : profile.data && privacy.data ? <ProfileForm profile={profile.data} privacy={privacy.data} />
        : <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><Skeleton className="h-96" /><Skeleton className="h-64" /></div>}
    </>
  );
}

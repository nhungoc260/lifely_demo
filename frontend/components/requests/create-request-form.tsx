"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { LocationPicker } from "@/components/map/location-picker";
import { CoveragePanel } from "@/components/requests/coverage-panel";
import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, UrgencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { formatDateTime } from "@/lib/format";
import { URGENCY_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { publicApi, requestApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";
import { BLOOD_TYPES } from "@/types/domain";

const schema = z.object({
  bloodType: z.string().refine((v) => (BLOOD_TYPES as readonly string[]).includes(v), "Chọn nhóm máu"),
  unitsRequired: z.number({ message: "Nhập số đơn vị" }).int().min(1, "Tối thiểu 1 đơn vị").max(20, "Tối đa 20 đơn vị"),
  organizationId: z.string(),
  hospitalName: z.string().trim().min(2, "Nhập tên bệnh viện hoặc địa điểm").max(200),
  city: z.string().trim().min(1, "Nhập thành phố"),
  district: z.string().trim(),
  latitude: z.number({ message: "Chọn vị trí trên bản đồ" }),
  longitude: z.number({ message: "Chọn vị trí trên bản đồ" }),
  urgency: z.enum(["CRITICAL", "URGENT", "NORMAL"]),
  deadlineLocal: z.string().min(1, "Chọn hạn chót").refine((v) => {
    const t = new Date(v).getTime();
    return t >= Date.now() + 5 * 60_000;
  }, "Hạn chót phải cách hiện tại ít nhất 5 phút").refine((v) => new Date(v).getTime() <= Date.now() + 7 * 86_400_000, "Hạn chót không được quá 7 ngày"),
  contactPhone: z.string().regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  description: z.string().max(1000, "Tối đa 1000 ký tự"),
});
type Values = z.infer<typeof schema>;

const PRESETS = [{ label: "1 giờ", min: 60 }, { label: "3 giờ", min: 180 }, { label: "12 giờ", min: 720 }, { label: "24 giờ", min: 1440 }, { label: "3 ngày", min: 4320 }];
const URGENCIES = [
  { v: "CRITICAL", title: "Nguy kịch", desc: "Nguy hiểm đến tính mạng, cần trong vài giờ" },
  { v: "URGENT", title: "Khẩn", desc: "Cần trong ngày" },
  { v: "NORMAL", title: "Bình thường", desc: "Có kế hoạch, thời gian linh hoạt" },
] as const;

function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateRequestForm({ basePath }: { basePath: "/requester" | "/organization" }) {
  const router = useRouter();
  const { user } = useAuth();
  const orgs = useQuery("hospitals", publicApi.organizations);
  const [preview, setPreview] = useState<Values | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Một khóa cho mỗi lần mở biểu mẫu: bấm đúp, nhiều tab hay retry mạng không tạo yêu cầu thứ hai.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [formError, setFormError] = useState<string | null>(null);

  const { register, control, handleSubmit, setValue, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { bloodType: "", unitsRequired: 1, organizationId: "", hospitalName: "", city: "TP. Hồ Chí Minh", district: "", urgency: "URGENT", deadlineLocal: "", contactPhone: user?.phone ?? "", description: "" },
  });
  const orgId = useWatch({ control, name: "organizationId" });
  const lat = useWatch({ control, name: "latitude" });
  const lng = useWatch({ control, name: "longitude" });
  const bt = useWatch({ control, name: "bloodType" });

  function pickHospital(id: string) {
    setValue("organizationId", id);
    const o = orgs.data?.find((x) => x.id === id);
    if (o) {
      setValue("hospitalName", o.name, { shouldValidate: true });
      setValue("city", o.city, { shouldValidate: true });
      setValue("district", o.district ?? "");
      setValue("latitude", o.latitude, { shouldValidate: true });
      setValue("longitude", o.longitude, { shouldValidate: true });
    }
  }

  async function submit(v: Values) {
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await requestApi.create({
        bloodType: v.bloodType, unitsRequired: v.unitsRequired, hospitalName: v.hospitalName, city: v.city,
        district: v.district || undefined, latitude: v.latitude, longitude: v.longitude, urgency: v.urgency,
        deadline: new Date(v.deadlineLocal).toISOString(), contactPhone: v.contactPhone,
        description: v.description || undefined, organizationId: v.organizationId || undefined,
      }, idempotencyKey);
      toast.success(created.verified
        ? "Yêu cầu đã được tiếp nhận. Chúng tôi đang tìm người hiến máu; việc có máu hay không do cơ sở y tế quyết định."
        : "Đã gửi yêu cầu để xác minh.");
      router.push(`${basePath}/requests/${created.id}`);
    } catch (e) {
      setPreview(null);
      if (!applyServerErrors(e, setError)) setFormError(toApiError(e).message);
    } finally { setSubmitting(false); }
  }

  if (preview) {
    const p = preview;
    return (
      <>
        <PageHeader title="Xem lại yêu cầu của bạn" description="Kiểm tra lại thông tin trước khi LIFELY liên hệ người hiến máu." />
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Tóm tắt yêu cầu</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3"><UrgencyBadge urgency={p.urgency} /><BloodChip type={p.bloodType} className="text-lg" /></div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Nhóm máu</dt><dd className="font-medium">{p.bloodType}</dd></div>
              <div><dt className="text-muted-foreground">Số đơn vị</dt><dd className="font-medium">{p.unitsRequired}</dd></div>
              <div><dt className="text-muted-foreground">Địa điểm</dt><dd className="font-medium">{p.hospitalName}</dd><dd className="text-muted-foreground">{[p.district, p.city].filter(Boolean).join(", ")}</dd></div>
              <div><dt className="text-muted-foreground">Mức độ khẩn cấp</dt><dd className="font-medium">{URGENCY_LABEL[p.urgency]}</dd></div>
              <div><dt className="text-muted-foreground">Hạn chót</dt><dd className="font-medium">{formatDateTime(new Date(p.deadlineLocal).toISOString())}</dd></div>
              <div><dt className="text-muted-foreground">Liên hệ</dt><dd className="font-medium">{p.contactPhone}</dd></div>
              {p.description && <div className="sm:col-span-2"><dt className="text-muted-foreground">Mô tả</dt><dd className="whitespace-pre-wrap">{p.description}</dd></div>}
            </dl>
            <div className="mt-6"><CoveragePanel bloodType={p.bloodType} latitude={p.latitude} longitude={p.longitude} /></div>
            <p className="mt-6 flex gap-2 rounded-xl bg-muted p-4 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden />Yêu cầu được xác minh trước khi liên hệ người hiến máu. Không ghi tên bệnh nhân hay thông tin y tế. Số điện thoại của bạn chỉ hiển thị với người hiến máu đã nhận lời.</p>
            {formError && <p role="alert" className="mt-4 text-sm text-critical">{formError}</p>}
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={() => setPreview(null)} disabled={submitting}><ArrowLeft /> Chỉnh sửa</Button>
              <Button size="lg" onClick={() => submit(p)} disabled={submitting}>{submitting && <Loader2 className="animate-spin" />} {submitting ? "Đang tạo yêu cầu…" : "Tạo yêu cầu khẩn cấp"}</Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Tạo yêu cầu máu" description="Cho chúng tôi biết bạn cần gì. Chúng tôi xác minh yêu cầu rồi tìm người hiến máu phù hợp ở gần." />
      <form onSubmit={handleSubmit((v) => setPreview(v))} noValidate className="max-w-3xl space-y-6">
        {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
        <Card>
          <CardHeader><CardTitle>Máu cần thiết</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Nhóm máu</legend>
              <div role="radiogroup" className="grid grid-cols-4 gap-2 sm:gap-3">
                {BLOOD_TYPES.map((b) => (
                  <label key={b} className={cn("grid h-14 cursor-pointer place-items-center rounded-xl border border-border bg-card text-lg font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", bt === b && "border-primary bg-secondary text-primary")}>
                    <input type="radio" value={b} className="sr-only" {...register("bloodType")} />{b}
                  </label>
                ))}
              </div>
              {errors.bloodType && <p role="alert" className="mt-2 text-xs font-medium text-critical">{errors.bloodType.message}</p>}
            </fieldset>
            <Field label="Số đơn vị cần" htmlFor="units" error={errors.unitsRequired?.message} hint="Từ 1 đến 20 đơn vị" className="max-w-40">
              <Input id="units" type="number" inputMode="numeric" min={1} max={20} aria-invalid={!!errors.unitsRequired} {...register("unitsRequired", { valueAsNumber: true })} />
            </Field>
            <Controller control={control} name="urgency" render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Mức độ khẩn cấp</legend>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                  {URGENCIES.map((u) => (
                    <label key={u.v} className={cn("cursor-pointer rounded-xl border border-border bg-card p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", field.value === u.v && "border-primary bg-secondary")}>
                      <input type="radio" className="sr-only" checked={field.value === u.v} onChange={() => field.onChange(u.v)} />
                      <UrgencyBadge urgency={u.v} /><span className="mt-2 block text-xs text-muted-foreground">{u.desc}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bệnh viện / địa điểm</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Field label="Bệnh viện đã xác minh" htmlFor="org" hint="Chọn bệnh viện đã xác minh sẽ đặt đúng vị trí cho bạn và có thể giúp xác minh nhanh hơn.">
              <Select id="org" value={orgId} onChange={(e) => pickHospital(e.target.value)}>
                <option value="">Địa điểm khác (nhập thủ công)</option>
                {orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}{o.district ? ` – ${o.district}` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Tên bệnh viện / địa điểm" htmlFor="hospitalName" error={errors.hospitalName?.message}><Input id="hospitalName" readOnly={!!orgId} {...register("hospitalName")} aria-invalid={!!errors.hospitalName} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Thành phố" htmlFor="city" error={errors.city?.message}><Input id="city" readOnly={!!orgId} {...register("city")} /></Field>
              <Field label="Quận/Huyện" htmlFor="district"><Input id="district" readOnly={!!orgId} {...register("district")} /></Field>
            </div>
            {!orgId && (
              <>
                <LocationPicker latitude={lat ?? null} longitude={lng ?? null} onChange={(a, b) => { setValue("latitude", a, { shouldValidate: true }); setValue("longitude", b, { shouldValidate: true }); }} hospitals={orgs.data} help="Đặt ghim ở nơi người hiến máu cần đến." />
                {(errors.latitude || errors.longitude) && <p role="alert" className="text-xs font-medium text-critical">Chọn vị trí trên bản đồ</p>}
              </>
            )}
          </CardContent>
        </Card>

        <CoveragePanel bloodType={bt} latitude={lat ?? null} longitude={lng ?? null} />

        <Card>
          <CardHeader><CardTitle>Hạn chót &amp; liên hệ</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Cần trong vòng</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => <Button key={p.min} type="button" variant="outline" size="sm" onClick={() => setValue("deadlineLocal", toLocalInput(Date.now() + p.min * 60_000), { shouldValidate: true })}>{p.label}</Button>)}
              </div>
            </div>
            <Field label="Hạn chót" htmlFor="deadline" error={errors.deadlineLocal?.message}><Input id="deadline" type="datetime-local" aria-invalid={!!errors.deadlineLocal} {...register("deadlineLocal")} /></Field>
            <Field label="SĐT liên hệ" htmlFor="contact" error={errors.contactPhone?.message} hint="Chỉ hiển thị với người hiến máu đã nhận lời."><Input id="contact" type="tel" aria-invalid={!!errors.contactPhone} {...register("contactPhone")} /></Field>
            <Field label="Mô tả (không bắt buộc)" htmlFor="desc" error={errors.description?.message} hint="Khoa, phòng hoặc hướng dẫn cho người hiến máu. Không ghi tên bệnh nhân."><Textarea id="desc" maxLength={1000} {...register("description")} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end"><Button type="submit" size="lg">Xem lại yêu cầu</Button></div>
      </form>
    </>
  );
}

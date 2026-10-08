"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { LocationPicker } from "@/components/map/location-picker";
import { PageHeader } from "@/components/shell/page-header";
import { OrgStatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { API_URL, toApiError } from "@/lib/api";
import { tokenStore } from "@/lib/auth-store";
import { applyServerErrors } from "@/lib/forms";
import { formatDate } from "@/lib/format";
import { orgApi } from "@/services";
import type { Organization } from "@/types/domain";

const schema = z.object({
  name: z.string().trim().min(2, "Nhập tên tổ chức"),
  type: z.enum(["HOSPITAL", "BLOOD_CENTER", "CLINIC", "NGO"]),
  address: z.string().trim().min(3, "Nhập địa chỉ"),
  city: z.string().trim().min(1, "Nhập thành phố"),
  district: z.string().trim(),
  latitude: z.number({ message: "Chọn vị trí trên bản đồ" }),
  longitude: z.number({ message: "Chọn vị trí trên bản đồ" }),
  phone: z.string().regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  email: z.string().email("Email không hợp lệ"),
  contactPerson: z.string().trim().min(2, "Nhập người liên hệ"),
});
type Values = z.infer<typeof schema>;

const DOC_TYPES = [["OPERATING_LICENSE", "Giấy phép hoạt động"], ["BUSINESS_REGISTRATION", "Đăng ký kinh doanh"], ["AUTHORIZATION_LETTER", "Giấy ủy quyền"], ["OTHER", "Khác"]];

function OrgForm({ org, reload }: { org: Organization | null; reload: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("OPERATING_LICENSE");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, setError, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: org?.name ?? "", type: org?.type ?? "HOSPITAL", address: org?.address ?? "", city: org?.city ?? "TP. Hồ Chí Minh", district: org?.district ?? "", latitude: org?.latitude ?? undefined, longitude: org?.longitude ?? undefined, phone: org?.phone ?? "", email: org?.email ?? "", contactPerson: org?.contactPerson ?? "" },
  });
  const lat = watch("latitude");
  const lng = watch("longitude");

  async function save(v: Values) {
    try { await orgApi.save({ ...v, district: v.district || null }); toast.success("Đã lưu hồ sơ tổ chức"); reload(); }
    catch (e) { if (!applyServerErrors(e, setError)) toast.error(toApiError(e).message); }
  }

  async function upload(file: File) {
    setUploading(true);
    try { await orgApi.upload(docType, file); toast.success("Đã tải giấy tờ lên"); reload(); }
    catch (e) { toast.error(toApiError(e).message); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function submit() {
    setSubmitting(true);
    try { await orgApi.submit(); toast.success("Đã gửi để xác minh"); reload(); }
    catch (e) { toast.error(toApiError(e).message); } finally { setSubmitting(false); }
  }

  async function download(id: string, name: string) {
    try {
      const res = await fetch(`${API_URL}/api/organizations/documents/${id}/download`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Không tải được tài liệu."); }
  }

  const canSubmit = org && (org.verificationStatus === "PENDING" || org.verificationStatus === "REJECTED");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={handleSubmit(save)} noValidate className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Thông tin tổ chức</CardTitle></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="Tên tổ chức" htmlFor="name" error={errors.name?.message} className="sm:col-span-2"><Input id="name" {...register("name")} aria-invalid={!!errors.name} /></Field>
            <Field label="Loại hình" htmlFor="type"><Select id="type" {...register("type")}><option value="HOSPITAL">Bệnh viện</option><option value="BLOOD_CENTER">Trung tâm máu</option><option value="CLINIC">Phòng khám</option><option value="NGO">Tổ chức phi chính phủ</option></Select></Field>
            <Field label="Người liên hệ" htmlFor="contactPerson" error={errors.contactPerson?.message}><Input id="contactPerson" {...register("contactPerson")} aria-invalid={!!errors.contactPerson} /></Field>
            <Field label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}><Input id="phone" type="tel" {...register("phone")} aria-invalid={!!errors.phone} /></Field>
            <Field label="Email" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} /></Field>
            <Field label="Địa chỉ" htmlFor="address" error={errors.address?.message} className="sm:col-span-2"><Input id="address" {...register("address")} aria-invalid={!!errors.address} /></Field>
            <Field label="Thành phố" htmlFor="city" error={errors.city?.message}><Input id="city" {...register("city")} /></Field>
            <Field label="Quận/Huyện" htmlFor="district"><Input id="district" {...register("district")} /></Field>
            <div className="sm:col-span-2">
              <LocationPicker latitude={lat ?? null} longitude={lng ?? null} onChange={(a, b) => { setValue("latitude", a, { shouldValidate: true }); setValue("longitude", b, { shouldValidate: true }); }} help="Dùng làm vị trí chính xác cho các yêu cầu của bạn." />
              {(errors.latitude || errors.longitude) && <p role="alert" className="mt-2 text-xs font-medium text-critical">Chọn vị trí trên bản đồ</p>}
            </div>
          </CardContent>
        </Card>
        {org?.verificationStatus === "VERIFIED" && <p className="rounded-xl bg-warning/10 p-4 text-sm">Đổi tên, địa chỉ hoặc vị trí sẽ phải xác minh lại.</p>}
        <div className="flex justify-end"><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Lưu hồ sơ</Button></div>
      </form>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Xác minh</CardTitle>{org && <OrgStatusBadge status={org.verificationStatus} />}</CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!org ? <p className="text-muted-foreground">Hãy lưu thông tin trước, rồi tải giấy tờ lên.</p> : (
              <>
                {org.verificationNote && <p className="rounded-xl bg-muted p-3">{org.verificationNote}</p>}
                {org.verifiedAt && <p className="text-muted-foreground">Xác minh ngày {formatDate(org.verifiedAt)}</p>}
                <ul className="divide-y divide-border">
                  {org.documents.length === 0 && <li className="py-3 text-muted-foreground">Chưa tải giấy tờ nào lên.</li>}
                  {org.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-3"><span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden /><span className="truncate">{d.fileName}</span></span><Button size="sm" variant="ghost" onClick={() => download(d.id, d.fileName)}>Tải xuống</Button></li>
                  ))}
                </ul>
                {(org.verificationStatus === "PENDING" || org.verificationStatus === "REJECTED") && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <Field label="Loại giấy tờ" htmlFor="doctype"><Select id="doctype" value={docType} onChange={(e) => setDocType(e.target.value)}>{DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
                    <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" id="doc-file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                    <Button type="button" variant="outline" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />} Tải lên PDF, PNG hoặc JPG (tối đa 5 MB)</Button>
                  </div>
                )}
                {canSubmit && <Button className="w-full" onClick={submit} disabled={submitting || org.documents.length === 0}>{submitting && <Loader2 className="animate-spin" />} Gửi xác minh</Button>}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OrganizationProfilePage() {
  const q = useQuery("org-profile", orgApi.me);
  return (
    <>
      <PageHeader title="Tổ chức" description="Hồ sơ và trạng thái xác minh của bạn." />
      {q.error ? <ErrorState message={q.error.message} onRetry={q.reload} /> : q.data !== undefined ? <OrgForm key={q.data?.id ?? "new"} org={q.data} reload={q.reload} /> : <Skeleton className="h-96" />}
    </>
  );
}

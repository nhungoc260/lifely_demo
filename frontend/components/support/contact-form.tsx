"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { publicApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";

const schema = z.object({
  name: z.string().trim().min(2, "Nhập tên của bạn"),
  email: z.string().min(1, "Nhập email của bạn").email("Email không hợp lệ"),
  phone: z.string().refine((v) => v === "" || /^(0|\+84)\d{9,10}$/.test(v), "Số điện thoại không hợp lệ"),
  message: z.string().trim().min(10, "Vui lòng viết ít nhất 10 ký tự").max(2000, "Tối đa 2000 ký tự"),
});
type Values = z.infer<typeof schema>;

export function ContactForm() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { name: user?.fullName ?? "", email: user?.email ?? "", phone: user?.phone ?? "", message: "" },
    resetOptions: { keepDirtyValues: true },
  });

  if (sent) {
    return (
      <div role="status" className="rounded-2xl border border-success/30 bg-success/5 p-6 text-sm">
        <CheckCircle2 className="mb-2 size-6 text-success" aria-hidden />
        <p className="text-base font-medium">Đã gửi tin nhắn</p>
        <p className="mt-1 text-muted-foreground">Cảm ơn bạn. Đội ngũ của chúng tôi sẽ trả lời qua email bạn cung cấp. Nếu việc gấp, vui lòng gọi nhân viên.</p>
      </div>
    );
  }

  return (
    <form
      id="message"
      noValidate
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={handleSubmit(async (v) => {
        setFormError(null);
        try { await publicApi.contact({ ...v, phone: v.phone || undefined }); setSent(true); }
        catch (e) { if (!applyServerErrors(e, setError)) setFormError(toApiError(e).message); }
      })}
    >
      <h2 className="text-lg font-semibold">Gửi tin nhắn cho chúng tôi</h2>
      {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên của bạn" htmlFor="c-name" error={errors.name?.message}><Input id="c-name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} /></Field>
        <Field label="Email" htmlFor="c-email" error={errors.email?.message}><Input id="c-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
      </div>
      <Field label="Số điện thoại (không bắt buộc)" htmlFor="c-phone" error={errors.phone?.message}><Input id="c-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
      <Field label="Chúng tôi có thể giúp gì cho bạn?" htmlFor="c-msg" error={errors.message?.message} hint="Vui lòng không ghi tên bệnh nhân hay thông tin y tế."><Textarea id="c-msg" rows={5} maxLength={2000} aria-invalid={!!errors.message} {...register("message")} /></Field>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} {isSubmitting ? "Đang gửi…" : "Gửi tin nhắn"}</Button>
    </form>
  );
}

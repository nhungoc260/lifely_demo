"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, HeartHandshake, Loader2, Droplets } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { authApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Nhập họ và tên").max(150),
    email: z.string().min(1, "Nhập email của bạn").email("Email không hợp lệ"),
    phone: z.string().regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, "Dùng từ 8 ký tự, gồm chữ hoa, chữ thường và số"),
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu"),
    role: z.enum(["DONOR", "REQUESTER", "ORGANIZATION"]),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu nhập lại không khớp" });
type Values = z.infer<typeof schema>;

const ROLES = [
  { value: "DONOR", title: "Người hiến máu", desc: "Được kết nối với các yêu cầu ở gần", icon: Droplets },
  { value: "REQUESTER", title: "Người cần máu", desc: "Tôi cần máu cho bệnh nhân", icon: HeartHandshake },
  { value: "ORGANIZATION", title: "Tổ chức", desc: "Bệnh viện hoặc trung tâm máu", icon: Building2 },
] as const;

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const initial = ["DONOR", "REQUESTER", "ORGANIZATION"].includes(params.get("role") ?? "") ? (params.get("role") as Values["role"]) : "DONOR";
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: initial },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const res = await authApi.register(values);
      signIn(res);
      toast.success("Tài khoản của bạn đã sẵn sàng");
      router.replace("/onboarding");
    } catch (e) {
      if (!applyServerErrors(e, setError)) setFormError(toApiError(e).message);
    }
  }

  return (
    <AuthLayout title="Tạo tài khoản của bạn" subtitle="Tham gia mạng lưới. Chỉ mất khoảng một phút.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}

        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Tôi tham gia với vai trò</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                {ROLES.map((r) => (
                  <label key={r.value} className={cn("cursor-pointer rounded-xl border border-border bg-card p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", field.value === r.value && "border-primary bg-secondary")}>
                    <input type="radio" className="sr-only" name={field.name} value={r.value} checked={field.value === r.value} onChange={() => field.onChange(r.value)} />
                    <r.icon className={cn("mb-2 size-5", field.value === r.value ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    <span className="block font-medium">{r.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{r.desc}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        />

        <Field label="Họ và tên" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="09xxxxxxxx" aria-invalid={!!errors.phone} {...register("phone")} />
          </Field>
        </div>
        <Field label="Mật khẩu" htmlFor="password" error={errors.password?.message} hint="Từ 8 ký tự, gồm chữ hoa, chữ thường và số">
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field label="Nhập lại mật khẩu" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Khi tiếp tục, bạn đồng ý với <Link href="/info/terms" className="underline">Điều khoản</Link> và <Link href="/info/privacy" className="underline">Chính sách quyền riêng tư</Link>.
        </p>
        <p className="text-center text-sm text-muted-foreground">Đã có tài khoản? <Link href="/login" className="font-medium text-primary hover:underline">Đăng nhập</Link></p>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}

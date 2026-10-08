"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { authApi } from "@/services";

const schema = z
  .object({
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, "Dùng từ 8 ký tự, gồm chữ hoa, chữ thường và số"),
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu"),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu nhập lại không khớp" });
type Values = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthLayout title="Thiếu liên kết đặt lại" subtitle="Trang này cần một liên kết đặt lại hợp lệ.">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">Yêu cầu liên kết mới</Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Chọn mật khẩu mới" subtitle="Hãy chọn mật khẩu mạnh mà bạn chưa từng dùng.">
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit(async ({ password }) => {
          setFormError(null);
          try {
            await authApi.reset(token, password);
            toast.success("Đã cập nhật mật khẩu. Vui lòng đăng nhập.");
            router.replace("/login");
          } catch (e) { setFormError(toApiError(e).message); }
        })}
      >
        {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
        <Field label="Mật khẩu mới" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field label="Nhập lại mật khẩu" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Cập nhật mật khẩu
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}

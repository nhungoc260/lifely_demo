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
import { safeNext } from "@/lib/forms";
import { authApi } from "@/services";
import { homeFor, useAuth } from "@/providers/auth-provider";

const schema = z.object({
  email: z.string().min(1, "Nhập email của bạn").email("Email không hợp lệ"),
  password: z.string().min(1, "Nhập mật khẩu"),
});
type Values = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const res = await authApi.login(values);
      signIn(res);
      toast.success(`Chào mừng trở lại, ${res.user.fullName}`);
      const role = res.user.roles[0];
      router.replace(safeNext(params.get("next")) ?? (role === "DONOR" && !res.user.onboardingCompleted ? "/onboarding" : homeFor(role)));
    } catch (e) {
      setFormError(toApiError(e).message);
    }
  }

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng bạn quay lại. Đăng nhập để tiếp tục dùng LIFELY.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <div className="flex justify-end text-sm"><Link href="/forgot-password" className="text-primary hover:underline">Quên mật khẩu?</Link></div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">Bạn mới biết đến LIFELY? <Link href="/register" className="font-medium text-primary hover:underline">Tạo tài khoản</Link></p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

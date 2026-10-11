"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/auth-layout";
import { RolePicker, isRoleValue } from "@/components/auth/role-picker";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { clearPendingGoogle, parsePendingGoogle, readPendingGoogleRaw, type PendingGoogle } from "@/lib/google";
import { authApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";

const schema = z.object({
  fullName: z.string().trim().min(2, "Nhập họ và tên").max(150),
  phone: z.string().regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  role: z.enum(["DONOR", "REQUESTER", "ORGANIZATION"]),
});
type Values = z.infer<typeof schema>;

const noopSubscribe = () => () => {};

function GoogleProfileForm({ pending }: { pending: PendingGoogle }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: pending.fullName, phone: "", role: isRoleValue(pending.role) ? pending.role : "DONOR" },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const res = await authApi.googleRegister({ credential: pending.credential, ...values });
      clearPendingGoogle();
      signIn(res);
      toast.success("Tài khoản của bạn đã sẵn sàng");
      router.replace("/onboarding");
    } catch (e) {
      const err = toApiError(e);
      if (err.code === "INVALID_GOOGLE_TOKEN") setTokenExpired(true);
      if (!applyServerErrors(e, setError)) setFormError(err.message);
    }
  }

  return (
    <AuthLayout title="Hoàn tất hồ sơ" subtitle="Bạn đã xác thực bằng Google. Chọn vai trò và nhập số điện thoại để bắt đầu.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}

        <Controller control={control} name="role" render={({ field }) => <RolePicker name={field.name} value={field.value} onChange={field.onChange} />} />

        <Field label="Email (từ Google)" htmlFor="email">
          <Input id="email" type="email" value={pending.email} readOnly disabled />
        </Field>
        <Field label="Họ và tên" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
        </Field>
        <Field label="Số điện thoại" htmlFor="phone" error={errors.phone?.message} hint="Dùng để người cần máu liên hệ khi bạn chấp nhận yêu cầu">
          <Input id="phone" type="tel" autoComplete="tel" placeholder="09xxxxxxxx" aria-invalid={!!errors.phone} {...register("phone")} />
        </Field>

        {tokenExpired ? (
          <Button asChild size="lg" className="w-full"><Link href="/login" onClick={clearPendingGoogle}>Đăng nhập lại với Google</Link></Button>
        ) : (
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />} {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          </Button>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Khi tiếp tục, bạn đồng ý với <Link href="/info/terms" className="underline">Điều khoản</Link> và <Link href="/info/privacy" className="underline">Chính sách quyền riêng tư</Link>.
        </p>
        <p className="text-center text-sm text-muted-foreground"><Link href="/login" onClick={clearPendingGoogle} className="font-medium text-primary hover:underline">Quay lại đăng nhập</Link></p>
      </form>
    </AuthLayout>
  );
}

export default function GoogleProfilePage() {
  const router = useRouter();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const raw = useSyncExternalStore(noopSubscribe, readPendingGoogleRaw, () => null);
  const pending = useMemo(() => parsePendingGoogle(raw), [raw]);

  // Không có thông tin Google đang chờ (mở thẳng trang này, hoặc đã hết phiên): quay lại đăng nhập.
  useEffect(() => {
    if (hydrated && !pending) router.replace("/login");
  }, [hydrated, pending, router]);

  if (!pending) return null;
  return <GoogleProfileForm pending={pending} />;
}

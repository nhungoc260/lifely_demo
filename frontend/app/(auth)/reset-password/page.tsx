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
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, "Use 8+ characters with upper case, lower case and a number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthLayout title="Reset link missing" subtitle="This page needs a valid reset link.">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">Request a new link</Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Choose a new password" subtitle="Pick a strong password you have not used before.">
      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit(async ({ password }) => {
          setFormError(null);
          try {
            await authApi.reset(token, password);
            toast.success("Password updated. Please log in.");
            router.replace("/login");
          } catch (e) { setFormError(toApiError(e).message); }
        })}
      >
        {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
        <Field label="New password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}

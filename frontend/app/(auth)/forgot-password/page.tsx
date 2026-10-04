"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { authApi } from "@/services";

const schema = z.object({ email: z.string().min(1, "Enter your email").email("Enter a valid email") });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we will send a reset link.">
      {sent ? (
        <div role="status" className="rounded-2xl border border-success/30 bg-success/5 p-5 text-sm">
          <CheckCircle2 className="mb-2 size-5 text-success" aria-hidden />
          <p className="font-medium">Check your inbox</p>
          <p className="mt-1 text-muted-foreground">If an account exists for this email, a reset link has been sent. The link expires in 30 minutes.</p>
          <Link href="/login" className="mt-4 inline-block font-medium text-primary hover:underline">Back to log in</Link>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-5"
          onSubmit={handleSubmit(async ({ email }) => {
            setFormError(null);
            try { await authApi.forgot(email); setSent(true); } catch (e) { setFormError(toApiError(e).message); }
          })}
        >
          {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />} Send reset link
          </Button>
          <p className="text-center text-sm"><Link href="/login" className="text-primary hover:underline">Back to log in</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}

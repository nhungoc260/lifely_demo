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
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  phone: z.string().refine((v) => v === "" || /^(0|\+84)\d{9,10}$/.test(v), "Enter a valid Vietnamese phone number"),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000, "Keep it under 2000 characters"),
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
        <p className="text-base font-medium">Message sent</p>
        <p className="mt-1 text-muted-foreground">Thank you. Our team will reply to the email you provided. If it is urgent, please call our staff.</p>
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
      <h2 className="text-lg font-semibold">Send us a message</h2>
      {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" error={errors.name?.message}><Input id="c-name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} /></Field>
        <Field label="Email" htmlFor="c-email" error={errors.email?.message}><Input id="c-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
      </div>
      <Field label="Phone (optional)" htmlFor="c-phone" error={errors.phone?.message}><Input id="c-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
      <Field label="How can we help?" htmlFor="c-msg" error={errors.message?.message} hint="Please do not include patient names or medical details."><Textarea id="c-msg" rows={5} maxLength={2000} aria-invalid={!!errors.message} {...register("message")} /></Field>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} {isSubmitting ? "Sending…" : "Send message"}</Button>
    </form>
  );
}

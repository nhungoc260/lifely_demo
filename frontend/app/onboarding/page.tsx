"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/layout/logo";
import { LocationPicker } from "@/components/map/location-picker";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { authApi, donorApi } from "@/services";
import { homeFor, useAuth } from "@/providers/auth-provider";
import { BLOOD_TYPES, type DonorProfile, type Privacy } from "@/types/domain";

const STEPS = ["Personal information", "Blood type", "Location", "Donation history", "Availability", "Privacy"];

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: z.string().regex(/^(0|\+84)\d{9,10}$/, "Enter a valid Vietnamese phone number"),
  bloodType: z.string().refine((v) => (BLOOD_TYPES as readonly string[]).includes(v), "Choose your blood type"),
  city: z.string().trim().min(1, "Enter your city"),
  district: z.string().trim().min(1, "Enter your district"),
  latitude: z.number({ message: "Pick your area on the map" }),
  longitude: z.number({ message: "Pick your area on the map" }),
  neverDonated: z.boolean(),
  lastDonationDate: z.string(),
  available: z.boolean(),
  showApproximateLocation: z.boolean(),
  allowEmergencyMatching: z.boolean(),
  receiveEmergencyNotifications: z.boolean(),
  showDonationCount: z.boolean(),
});
type Values = z.infer<typeof schema>;

const FIELDS_BY_STEP: (keyof Values)[][] = [["fullName", "phone"], ["bloodType"], ["city", "district", "latitude", "longitude"], ["lastDonationDate"], [], []];

function Wizard({ profile, privacy, startStep }: { profile: DonorProfile; privacy: Privacy; startStep: number }) {
  const router = useRouter();
  const { refresh, user } = useAuth();
  const [step, setStep] = useState(Math.min(Math.max(startStep, 1), 6) - 1);
  const [busy, setBusy] = useState(false);
  const { register, control, handleSubmit, trigger, getValues, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile.fullName, phone: profile.phone, bloodType: profile.bloodType ?? "",
      city: profile.city ?? "TP. Hồ Chí Minh", district: profile.district ?? "",
      latitude: profile.latitude ?? undefined, longitude: profile.longitude ?? undefined,
      neverDonated: !profile.lastDonationDate, lastDonationDate: profile.lastDonationDate ?? "",
      available: profile.availability === "AVAILABLE", ...privacy,
    },
  });

  async function persist(next: number, finalize: boolean) {
    const v = getValues();
    const body: Parameters<typeof donorApi.update>[0] = {};
    if (step >= 0 && v.fullName && v.phone) { body.fullName = v.fullName; body.phone = v.phone; }
    if (v.bloodType) body.bloodType = v.bloodType;
    if (v.city) body.city = v.city;
    if (v.district) body.district = v.district;
    if (typeof v.latitude === "number" && typeof v.longitude === "number") { body.latitude = v.latitude; body.longitude = v.longitude; }
    if (!v.neverDonated && v.lastDonationDate) body.lastDonationDate = v.lastDonationDate;
    await donorApi.update(body);
    if (finalize) {
      await donorApi.updatePrivacy({ showApproximateLocation: v.showApproximateLocation, allowEmergencyMatching: v.allowEmergencyMatching, receiveEmergencyNotifications: v.receiveEmergencyNotifications, showDonationCount: v.showDonationCount });
      await donorApi.setAvailability(v.available ? "AVAILABLE" : "NOT_AVAILABLE");
    }
    await authApi.saveOnboarding(Math.min(next + 1, 6), finalize);
    refresh();
  }

  async function guard<T>(fn: () => Promise<T>) {
    setBusy(true);
    try { return await fn(); } catch (e) { toast.error(toApiError(e).message); return undefined; } finally { setBusy(false); }
  }

  async function next() {
    if (!(await trigger(FIELDS_BY_STEP[step]))) return;
    if (step < 5) {
      const ok = await guard(() => persist(step + 1, false).then(() => true));
      if (ok) setStep(step + 1);
    }
  }

  const finish = handleSubmit(() =>
    guard(async () => {
      await persist(5, true);
      toast.success("You're all set. Thank you for joining LIFELY.");
      router.replace("/donor/dashboard");
    }).then(() => undefined),
  );

  async function later() {
    const ok = await guard(async () => { await persist(step + 1 > 5 ? 5 : step + 1, false); return true; });
    if (ok) { toast.success("Progress saved. You can continue any time from your profile."); router.replace("/donor/dashboard"); }
  }

  const bt = watch("bloodType");
  const lat = watch("latitude");
  const lng = watch("longitude");
  const never = watch("neverDonated");
  void user;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold", i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "border-border text-muted-foreground")}>
              {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />}
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{STEPS[step]}</h1>

      <form onSubmit={finish} noValidate className="mt-8 space-y-6">
        {step === 0 && (
          <>
            <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}><Input id="fullName" aria-invalid={!!errors.fullName} {...register("fullName")} /></Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message} hint="Only shared with a requester after you accept their request."><Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
          </>
        )}
        {step === 1 && (
          <fieldset>
            <legend className="mb-3 text-sm text-muted-foreground">Not sure? Ask the center where you last donated, or check your donor card.</legend>
            <div role="radiogroup" className="grid grid-cols-4 gap-3">
              {BLOOD_TYPES.map((b) => (
                <label key={b} className={cn("grid h-16 cursor-pointer place-items-center rounded-2xl border border-border bg-card text-xl font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", bt === b && "border-primary bg-secondary text-primary")}>
                  <input type="radio" value={b} className="sr-only" {...register("bloodType")} />{b}
                </label>
              ))}
            </div>
            {errors.bloodType && <p role="alert" className="mt-2 text-sm text-critical">{errors.bloodType.message}</p>}
          </fieldset>
        )}
        {step === 2 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City" htmlFor="city" error={errors.city?.message}><Input id="city" {...register("city")} aria-invalid={!!errors.city} /></Field>
              <Field label="District" htmlFor="district" error={errors.district?.message}><Input id="district" placeholder="e.g. Quận 1" {...register("district")} aria-invalid={!!errors.district} /></Field>
            </div>
            <LocationPicker latitude={lat ?? null} longitude={lng ?? null} onChange={(a, b) => { setValue("latitude", a, { shouldValidate: true }); setValue("longitude", b, { shouldValidate: true }); }} help="Used only to rank requests near you. It is never shown publicly." />
            {(errors.latitude || errors.longitude) && <p role="alert" className="text-sm text-critical">Pick your area on the map</p>}
          </>
        )}
        {step === 3 && (
          <>
            <Controller control={control} name="neverDonated" render={({ field }) => (
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
                <span><span className="block font-medium">I have never donated blood</span><span className="text-sm text-muted-foreground">That is completely fine.</span></span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )} />
            {!never && <Field label="Last donation date" htmlFor="lastDonationDate" error={errors.lastDonationDate?.message} hint="Helps us avoid contacting you too soon after a donation."><Input id="lastDonationDate" type="date" max={new Date().toISOString().slice(0, 10)} {...register("lastDonationDate")} /></Field>}
          </>
        )}
        {step === 4 && (
          <Controller control={control} name="available" render={({ field }) => (
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
              <span><span className="block text-lg font-medium">Available to donate</span><span className="text-sm text-muted-foreground">When off, you will not be matched or notified. You can change this any time.</span></span>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Available to donate" />
            </label>
          )} />
        )}
        {step === 5 && (
          <div className="space-y-3">
            {([
              ["showApproximateLocation", "Show approximate location", "Only your district, never your exact position."],
              ["allowEmergencyMatching", "Allow emergency matching", "Required for LIFELY to suggest you for requests."],
              ["receiveEmergencyNotifications", "Receive emergency notifications", "Get alerted when a verified request needs you."],
              ["showDonationCount", "Show donation count", "Display how many times you have donated."],
            ] as const).map(([name, title, desc]) => (
              <Controller key={name} control={control} name={name} render={({ field }) => (
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
                  <span><span className="block font-medium">{title}</span><span className="text-sm text-muted-foreground">{desc}</span></span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={title} />
                </label>
              )} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <Button type="button" variant="ghost" onClick={later} disabled={busy}>Save &amp; Continue Later</Button>
          <div className="flex gap-2">
            {step > 0 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={busy}>Back</Button>}
            {step < 5 ? <Button type="button" onClick={next} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Continue</Button> : <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Finish</Button>}
          </div>
        </div>
      </form>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { status, user, role } = useAuth();
  const profile = useQuery(role === "DONOR" ? "onboarding-profile" : null, donorApi.me);
  const privacy = useQuery(role === "DONOR" ? "onboarding-privacy" : null, donorApi.privacy);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    else if (status === "authenticated" && role === "ORGANIZATION") router.replace("/organization/profile");
    else if (status === "authenticated" && role && role !== "DONOR") router.replace(homeFor(role));
    else if (status === "authenticated" && user?.onboardingCompleted) router.replace("/donor/dashboard");
  }, [status, role, user, router]);

  return (
    <div className="min-h-dvh bg-surface px-5 py-8">
      <div className="mx-auto mb-10 max-w-2xl"><Logo /></div>
      {profile.error ? <div className="mx-auto max-w-2xl"><ErrorState message={profile.error.message} onRetry={profile.reload} /></div>
        : profile.data && privacy.data && user ? <Wizard profile={profile.data} privacy={privacy.data} startStep={user.onboardingStep} />
        : <div className="mx-auto max-w-2xl space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>}
    </div>
  );
}

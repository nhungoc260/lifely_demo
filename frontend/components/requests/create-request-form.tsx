"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { LocationPicker } from "@/components/map/location-picker";
import { CoveragePanel } from "@/components/requests/coverage-panel";
import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, UrgencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { publicApi, requestApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";
import { BLOOD_TYPES } from "@/types/domain";

const schema = z.object({
  bloodType: z.string().refine((v) => (BLOOD_TYPES as readonly string[]).includes(v), "Choose a blood type"),
  unitsRequired: z.number({ message: "Enter the number of units" }).int().min(1, "At least 1 unit").max(20, "At most 20 units"),
  organizationId: z.string(),
  hospitalName: z.string().trim().min(2, "Enter the hospital or location name").max(200),
  city: z.string().trim().min(1, "Enter the city"),
  district: z.string().trim(),
  latitude: z.number({ message: "Pick the location on the map" }),
  longitude: z.number({ message: "Pick the location on the map" }),
  urgency: z.enum(["CRITICAL", "URGENT", "NORMAL"]),
  deadlineLocal: z.string().min(1, "Choose a deadline").refine((v) => {
    const t = new Date(v).getTime();
    return t >= Date.now() + 5 * 60_000;
  }, "Deadline must be at least 5 minutes from now").refine((v) => new Date(v).getTime() <= Date.now() + 7 * 86_400_000, "Deadline cannot be more than 7 days away"),
  contactPhone: z.string().regex(/^(0|\+84)\d{9,10}$/, "Enter a valid Vietnamese phone number"),
  description: z.string().max(1000, "Keep it under 1000 characters"),
});
type Values = z.infer<typeof schema>;

const PRESETS = [{ label: "1 hour", min: 60 }, { label: "3 hours", min: 180 }, { label: "12 hours", min: 720 }, { label: "24 hours", min: 1440 }, { label: "3 days", min: 4320 }];
const URGENCIES = [
  { v: "CRITICAL", title: "Critical", desc: "Life-threatening, needed within hours" },
  { v: "URGENT", title: "Urgent", desc: "Needed within a day" },
  { v: "NORMAL", title: "Normal", desc: "Planned, flexible timing" },
] as const;

function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateRequestForm({ basePath }: { basePath: "/requester" | "/organization" }) {
  const router = useRouter();
  const { user } = useAuth();
  const orgs = useQuery("hospitals", publicApi.organizations);
  const [preview, setPreview] = useState<Values | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, control, handleSubmit, setValue, setError, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { bloodType: "", unitsRequired: 1, organizationId: "", hospitalName: "", city: "TP. Hồ Chí Minh", district: "", urgency: "URGENT", deadlineLocal: "", contactPhone: user?.phone ?? "", description: "" },
  });
  const orgId = watch("organizationId");
  const lat = watch("latitude");
  const lng = watch("longitude");
  const bt = watch("bloodType");

  function pickHospital(id: string) {
    setValue("organizationId", id);
    const o = orgs.data?.find((x) => x.id === id);
    if (o) {
      setValue("hospitalName", o.name, { shouldValidate: true });
      setValue("city", o.city, { shouldValidate: true });
      setValue("district", o.district ?? "");
      setValue("latitude", o.latitude, { shouldValidate: true });
      setValue("longitude", o.longitude, { shouldValidate: true });
    }
  }

  async function submit(v: Values) {
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await requestApi.create({
        bloodType: v.bloodType, unitsRequired: v.unitsRequired, hospitalName: v.hospitalName, city: v.city,
        district: v.district || undefined, latitude: v.latitude, longitude: v.longitude, urgency: v.urgency,
        deadline: new Date(v.deadlineLocal).toISOString(), contactPhone: v.contactPhone,
        description: v.description || undefined, organizationId: v.organizationId || undefined,
      });
      toast.success(created.verified ? "Request created. We are finding donors now." : "Request submitted for verification.");
      router.push(`${basePath}/requests/${created.id}`);
    } catch (e) {
      setPreview(null);
      if (!applyServerErrors(e, setError)) setFormError(toApiError(e).message);
    } finally { setSubmitting(false); }
  }

  if (preview) {
    const p = preview;
    return (
      <>
        <PageHeader title="Review your request" description="Check the details before LIFELY contacts donors." />
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Request summary</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3"><UrgencyBadge urgency={p.urgency} /><BloodChip type={p.bloodType} className="text-lg" /></div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Blood type</dt><dd className="font-medium">{p.bloodType}</dd></div>
              <div><dt className="text-muted-foreground">Units</dt><dd className="font-medium">{p.unitsRequired}</dd></div>
              <div><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{p.hospitalName}</dd><dd className="text-muted-foreground">{[p.district, p.city].filter(Boolean).join(", ")}</dd></div>
              <div><dt className="text-muted-foreground">Urgency</dt><dd className="font-medium">{p.urgency}</dd></div>
              <div><dt className="text-muted-foreground">Deadline</dt><dd className="font-medium">{formatDateTime(new Date(p.deadlineLocal).toISOString())}</dd></div>
              <div><dt className="text-muted-foreground">Contact</dt><dd className="font-medium">{p.contactPhone}</dd></div>
              {p.description && <div className="sm:col-span-2"><dt className="text-muted-foreground">Description</dt><dd className="whitespace-pre-wrap">{p.description}</dd></div>}
            </dl>
            <div className="mt-6"><CoveragePanel bloodType={p.bloodType} latitude={p.latitude} longitude={p.longitude} /></div>
            <p className="mt-6 flex gap-2 rounded-xl bg-muted p-4 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden />Requests are verified before donors are contacted. Do not include patient names or medical details. Your phone number is shown only to donors who accept.</p>
            {formError && <p role="alert" className="mt-4 text-sm text-critical">{formError}</p>}
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={() => setPreview(null)} disabled={submitting}><ArrowLeft /> Edit</Button>
              <Button size="lg" onClick={() => submit(p)} disabled={submitting}>{submitting && <Loader2 className="animate-spin" />} {submitting ? "Creating request…" : "Create Emergency Request"}</Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Create a blood request" description="Tell us what is needed. We verify the request, then find suitable donors nearby." />
      <form onSubmit={handleSubmit((v) => setPreview(v))} noValidate className="max-w-3xl space-y-6">
        {formError && <p role="alert" className="rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm text-critical">{formError}</p>}
        <Card>
          <CardHeader><CardTitle>Blood needed</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Blood type</legend>
              <div role="radiogroup" className="grid grid-cols-4 gap-2 sm:gap-3">
                {BLOOD_TYPES.map((b) => (
                  <label key={b} className={cn("grid h-14 cursor-pointer place-items-center rounded-xl border border-border bg-card text-lg font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", bt === b && "border-primary bg-secondary text-primary")}>
                    <input type="radio" value={b} className="sr-only" {...register("bloodType")} />{b}
                  </label>
                ))}
              </div>
              {errors.bloodType && <p role="alert" className="mt-2 text-xs font-medium text-critical">{errors.bloodType.message}</p>}
            </fieldset>
            <Field label="Units required" htmlFor="units" error={errors.unitsRequired?.message} hint="1 to 20 units" className="max-w-40">
              <Input id="units" type="number" inputMode="numeric" min={1} max={20} aria-invalid={!!errors.unitsRequired} {...register("unitsRequired", { valueAsNumber: true })} />
            </Field>
            <Controller control={control} name="urgency" render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Urgency</legend>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                  {URGENCIES.map((u) => (
                    <label key={u.v} className={cn("cursor-pointer rounded-xl border border-border bg-card p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", field.value === u.v && "border-primary bg-secondary")}>
                      <input type="radio" className="sr-only" checked={field.value === u.v} onChange={() => field.onChange(u.v)} />
                      <UrgencyBadge urgency={u.v} /><span className="mt-2 block text-xs text-muted-foreground">{u.desc}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Hospital / location</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Field label="Verified hospital" htmlFor="org" hint="Choosing a verified hospital sets the exact location for you and can speed up verification.">
              <Select id="org" value={orgId} onChange={(e) => pickHospital(e.target.value)}>
                <option value="">Other location (enter manually)</option>
                {orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}{o.district ? ` – ${o.district}` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Hospital / location name" htmlFor="hospitalName" error={errors.hospitalName?.message}><Input id="hospitalName" readOnly={!!orgId} {...register("hospitalName")} aria-invalid={!!errors.hospitalName} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City" htmlFor="city" error={errors.city?.message}><Input id="city" readOnly={!!orgId} {...register("city")} /></Field>
              <Field label="District" htmlFor="district"><Input id="district" readOnly={!!orgId} {...register("district")} /></Field>
            </div>
            {!orgId && (
              <>
                <LocationPicker latitude={lat ?? null} longitude={lng ?? null} onChange={(a, b) => { setValue("latitude", a, { shouldValidate: true }); setValue("longitude", b, { shouldValidate: true }); }} hospitals={orgs.data} help="Place the pin where donors should go." />
                {(errors.latitude || errors.longitude) && <p role="alert" className="text-xs font-medium text-critical">Pick the location on the map</p>}
              </>
            )}
          </CardContent>
        </Card>

        <CoveragePanel bloodType={bt} latitude={lat ?? null} longitude={lng ?? null} />

        <Card>
          <CardHeader><CardTitle>Deadline &amp; contact</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Needed within</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => <Button key={p.min} type="button" variant="outline" size="sm" onClick={() => setValue("deadlineLocal", toLocalInput(Date.now() + p.min * 60_000), { shouldValidate: true })}>{p.label}</Button>)}
              </div>
            </div>
            <Field label="Deadline" htmlFor="deadline" error={errors.deadlineLocal?.message}><Input id="deadline" type="datetime-local" aria-invalid={!!errors.deadlineLocal} {...register("deadlineLocal")} /></Field>
            <Field label="Contact phone" htmlFor="contact" error={errors.contactPhone?.message} hint="Shown only to donors who accept."><Input id="contact" type="tel" aria-invalid={!!errors.contactPhone} {...register("contactPhone")} /></Field>
            <Field label="Description (optional)" htmlFor="desc" error={errors.description?.message} hint="Ward, room or instructions for donors. Do not include patient names."><Textarea id="desc" maxLength={1000} {...register("description")} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end"><Button type="submit" size="lg">Review request</Button></div>
      </form>
    </>
  );
}

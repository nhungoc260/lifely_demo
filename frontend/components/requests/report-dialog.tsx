"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { reportApi } from "@/services";
import type { ReportReason } from "@/types/domain";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "FAKE_REQUEST", label: "Fake request" },
  { value: "SPAM", label: "Spam" },
  { value: "INCORRECT_INFORMATION", label: "Incorrect information" },
  { value: "ABUSE", label: "Abuse" },
  { value: "OTHER", label: "Other" },
];

export function ReportDialog({ targetType, targetId }: { targetType: "REQUEST" | "USER" | "ORGANIZATION"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("FAKE_REQUEST");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await reportApi.create({ targetType, targetId, reason, description: description.trim() || undefined });
      toast.success("Thank you. Our team will review this report.");
      setOpen(false);
      setDescription("");
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm"><Flag /> Report</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold tracking-tight">Report this {targetType.toLowerCase()}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">Help us keep LIFELY trustworthy. Reports are reviewed by our team.</Dialog.Description>
          <div className="mt-5 space-y-4">
            <Field label="Reason" htmlFor="report-reason">
              <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Details (optional)" htmlFor="report-desc">
              <Textarea id="report-desc" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="outline" disabled={busy}>Cancel</Button></Dialog.Close>
            <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Submit report</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

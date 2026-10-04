"use client";

import { Check, Copy, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BloodRequest } from "@/types/domain";

/**
 * Chia sẻ yêu cầu: gia đình thường tự đăng lên mạng xã hội, nên LIFELY cung cấp liên kết công khai an toàn
 * (chỉ có thông tin công khai, không có số điện thoại hay thông tin bệnh nhân) và poster in được có mã QR.
 */
export function ShareRequest({ r }: { r: BloodRequest }) {
  const [copied, setCopied] = useState(false);
  const live = r.verified && ["VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"].includes(r.status);
  if (!live) {
    return (
      <Card>
        <CardHeader><CardTitle>Share this request</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">The public link and printable poster become available once the request is verified.</p></CardContent>
      </Card>
    );
  }
  const url = () => `${window.location.origin}/requests/${r.id}`;
  const message = `${r.bloodType} blood needed (${r.unitsRequired - r.unitsConfirmed} unit(s)) at ${r.hospitalName}. See live status:`;

  async function copy() {
    try { await navigator.clipboard.writeText(url()); setCopied(true); toast.success("Link copied"); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error("Could not copy. Please copy the link from the address bar of the public page."); }
  }

  async function share() {
    try { await navigator.share({ title: "Blood needed", text: message, url: url() }); }
    catch { /* người dùng đóng hộp thoại chia sẻ */ }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <Card>
      <CardHeader><CardTitle>Share this request</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">The public page shows only the blood type, units, hospital and deadline. Your phone number and any personal details stay private.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />} Copy link</Button>
          {canShare && <Button variant="outline" onClick={share}><Share2 /> Share</Button>}
          <a href={`/requests/${r.id}/poster`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }))}><Printer /> Printable poster</a>
        </div>
      </CardContent>
    </Card>
  );
}

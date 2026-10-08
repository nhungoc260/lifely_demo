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
        <CardHeader><CardTitle>Chia sẻ yêu cầu này</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Liên kết công khai và poster in được sẽ có sau khi yêu cầu được xác minh.</p></CardContent>
      </Card>
    );
  }
  const url = () => `${window.location.origin}/requests/${r.id}`;
  const message = `Cần máu ${r.bloodType} (${r.unitsRequired - r.unitsConfirmed} đơn vị) tại ${r.hospitalName}. Xem trạng thái trực tiếp:`;

  async function copy() {
    try { await navigator.clipboard.writeText(url()); setCopied(true); toast.success("Đã sao chép liên kết"); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error("Không sao chép được. Hãy sao chép liên kết từ thanh địa chỉ của trang công khai."); }
  }

  async function share() {
    try { await navigator.share({ title: "Máu cần thiết", text: message, url: url() }); }
    catch { /* người dùng đóng hộp thoại chia sẻ */ }
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <Card>
      <CardHeader><CardTitle>Chia sẻ yêu cầu này</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Trang công khai chỉ hiển thị nhóm máu, số đơn vị, bệnh viện và hạn chót. Số điện thoại và mọi thông tin cá nhân của bạn được giữ kín.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />} Sao chép liên kết</Button>
          {canShare && <Button variant="outline" onClick={share}><Share2 /> Chia sẻ</Button>}
          <a href={`/requests/${r.id}/poster`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }))}><Printer /> Poster để in</a>
        </div>
      </CardContent>
    </Card>
  );
}

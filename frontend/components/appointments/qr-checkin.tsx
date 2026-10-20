"use client";

import { Loader2, QrCode as QrIcon, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseApptCode } from "@/components/appointments/qr-code";
import { Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { appointmentApi } from "@/services";

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;

/** Check-in bằng mã QR của người hiến: quét bằng camera (nếu trình duyệt hỗ trợ) hoặc dán mã. Dùng đúng thao tác CHECK_IN đã có; backend kiểm tra lịch hẹn thuộc cơ sở. */
export function QrCheckIn({ onDone }: { onDone?: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handler = useRef<(raw: string) => void>(() => {});
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  async function submit(raw: string) {
    const id = parseApptCode(raw);
    if (!id) { toast.error("Mã không hợp lệ. Hãy dùng mã QR từ lịch hẹn của người hiến."); return; }
    setBusy(true);
    try {
      const a = await appointmentApi.transition(id, "CHECK_IN");
      toast.success(`Đã check-in ${a.donorName}`);
      setCode("");
      onDone?.();
    } catch (e) { toast.error(toApiError(e).message); }
    finally { setBusy(false); }
  }
  useEffect(() => { handler.current = (raw) => { void submit(raw); }; });

  useEffect(() => {
    if (!scanning) return;
    let stop = false;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        const Det = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const det = new Det({ formats: ["qr_code"] });
        const tick = async () => {
          if (stop) return;
          try {
            const r = await det.detect(v);
            if (r[0]) { stop = true; setScanning(false); handler.current(r[0].rawValue); return; }
          } catch { /* khung hình chưa sẵn sàng */ }
          requestAnimationFrame(() => { void tick(); });
        };
        void tick();
      } catch {
        toast.error("Không mở được camera. Hãy cấp quyền camera hoặc dán mã vào ô bên dưới.");
        setScanning(false);
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [scanning]);

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle className="flex items-center gap-2"><QrIcon className="size-5 text-primary" aria-hidden />Check-in bằng mã QR</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {scanning && <video ref={videoRef} muted playsInline className="aspect-square w-full max-w-xs rounded-2xl bg-black object-cover" aria-label="Camera quét mã QR" />}
        <div className="flex flex-wrap gap-2">
          {canScan && <Button type="button" variant="outline" onClick={() => setScanning((s) => !s)}><ScanLine />{scanning ? "Dừng quét" : "Quét bằng camera"}</Button>}
        </div>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Dán mã từ QR (lifely:appt:…)" aria-label="Mã lịch hẹn" />
          <Button type="button" disabled={busy || !code.trim()} onClick={() => void submit(code)}>{busy && <Loader2 className="animate-spin" />}Check-in</Button>
        </div>
        {!canScan && <p className="text-xs text-muted-foreground">Trình duyệt này chưa hỗ trợ quét bằng camera, hãy dùng ô dán mã hoặc mở bằng Chrome trên Android.</p>}
      </CardContent>
    </Card>
  );
}

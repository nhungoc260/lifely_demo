"use client";

import jsQR from "jsqr";
import { ImageUp, Loader2, QrCode as QrIcon, ScanLine } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseApptCode } from "@/components/appointments/qr-code";
import { Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api";
import { appointmentApi } from "@/services";

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;

/** Có camera dùng được hay không (không phụ thuộc BarcodeDetector: máy tính để bàn dùng thư viện jsQR). */
const hasCamera = () => !!navigator.mediaDevices?.getUserMedia;
const noSubscribe = () => () => {};

/** Check-in bằng mã QR của người hiến: quét bằng camera (nếu trình duyệt hỗ trợ) hoặc dán mã. Dùng đúng thao tác CHECK_IN đã có; backend kiểm tra lịch hẹn thuộc cơ sở. */
export function QrCheckIn({ onDone }: { onDone?: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handler = useRef<(raw: string) => void>(() => {});
  const canScan = useSyncExternalStore(noSubscribe, hasCamera, () => false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  /** Đọc mã QR từ một ảnh (ví dụ ảnh chụp màn hình điện thoại của người hiến). */
  async function fromImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bmp, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
      if (!code) { toast.error("Không tìm thấy mã QR trong ảnh. Hãy chụp rõ và đủ khung mã."); return; }
      await submit(code.data);
    } catch { toast.error("Không đọc được ảnh này."); }
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
        const Det = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        const det = Det ? new Det({ formats: ["qr_code"] }) : null;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const read = async (): Promise<string | null> => {
          if (det) return (await det.detect(v))[0]?.rawValue ?? null;
          if (!ctx || !v.videoWidth) return null;
          const w = Math.min(480, v.videoWidth);
          const h = Math.round((w * v.videoHeight) / v.videoWidth);
          canvas.width = w; canvas.height = h;
          ctx.drawImage(v, 0, 0, w, h);
          return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
        };
        const tick = async () => {
          if (stop) return;
          try {
            const raw = await read();
            if (raw) { stop = true; setScanning(false); handler.current(raw); return; }
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
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><ImageUp />Chọn ảnh mã QR</Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void fromImage(e)} />
        </div>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Dán mã từ QR (lifely:appt:…)" aria-label="Mã lịch hẹn" />
          <Button type="button" disabled={busy || !code.trim()} onClick={() => void submit(code)}>{busy && <Loader2 className="animate-spin" />}Check-in</Button>
        </div>
        {!canScan && <p className="text-xs text-muted-foreground">Thiết bị này không có camera hoặc chưa cấp quyền camera. Bạn có thể chọn ảnh mã QR hoặc dán mã vào ô trên.</p>}
      </CardContent>
    </Card>
  );
}

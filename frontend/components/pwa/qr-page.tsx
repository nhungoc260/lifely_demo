"use client";

import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

function QrCard({ title, hint, url, filename }: { title: string; hint: string; url: string; filename: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // Ảnh lớn (1024px) để in hoặc đưa vào slide vẫn nét.
    QRCode.toDataURL(url, { margin: 2, width: 1024, errorCorrectionLevel: "M", color: { dark: "#151316", light: "#ffffff" } })
      .then((u) => { if (alive) setSrc(u); })
      .catch(() => { if (alive) setSrc(null); });
    return () => { alive = false; };
  }, [url]);

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh data: tạo tại chỗ
        <img src={src} alt={`Mã QR ${title}`} width={240} height={240} className="rounded-xl bg-white" />
      ) : (
        <div className="size-60 animate-pulse rounded-xl bg-muted" aria-busy="true" />
      )}
      <code className="break-all text-xs text-muted-foreground">{url}</code>
      {src && (
        <a href={src} download={filename} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Tải ảnh QR (PNG)</a>
      )}
    </section>
  );
}

/** Trang tạo 2 mã QR: một cho bản web, một cho trang cài app. Mở trên máy tính rồi tải ảnh để in hoặc dán vào slide. */
export function QrPage() {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  return (
    <main id="main" className="mx-auto min-h-dvh w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Logo />
        <h1 className="text-2xl font-semibold tracking-tight">Mã QR LIFELY</h1>
      </div>
      {origin && (
        <div className="grid gap-6 sm:grid-cols-2">
          <QrCard title="QR Web" hint="Quét để vào thẳng trang web." url={`${origin}/`} filename="lifely-qr-web.png" />
          <QrCard title="QR App" hint="Quét để mở hướng dẫn cài app." url={`${origin}/install`} filename="lifely-qr-app.png" />
        </div>
      )}
    </main>
  );
}

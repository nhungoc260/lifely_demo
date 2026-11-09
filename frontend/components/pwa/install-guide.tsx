"use client";

import { ArrowDown, Check, Copy, Download, ExternalLink, MoreVertical, PlusSquare, Share } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { canPromptFrom, getInstallSnapshot, getServerInstallSnapshot, installedFrom, promptInstall, subscribeInstall } from "@/lib/pwa-install";
import { isAndroidDevice, isInAppBrowser, isIosDevice, isIosSafari, isStandaloneDisplay } from "@/lib/pwa";
import { cn } from "@/lib/utils";

type Platform = "ssr" | "installed" | "in-app" | "ios-safari" | "ios-other" | "android" | "desktop";

const noopSubscribe = () => () => {};
const platformNow = (): Platform => {
  const ua = navigator.userAgent;
  const standalone = isStandaloneDisplay(
    window.matchMedia?.("(display-mode: standalone)").matches ?? false,
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
  if (standalone) return "installed";
  if (isInAppBrowser(ua)) return "in-app";
  if (isIosDevice(ua, navigator.platform, navigator.maxTouchPoints ?? 0)) return isIosSafari(ua) ? "ios-safari" : "ios-other";
  if (isAndroidDevice(ua)) return "android";
  return "desktop";
};

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{n}</span>
      <span className="pt-0.5 text-base leading-snug">{children}</span>
    </li>
  );
}

function CopyLink() {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setDone(true);
      toast.success("Đã sao chép liên kết");
      setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error("Không sao chép được, hãy giữ vào thanh địa chỉ để chép tay");
    }
  }
  return (
    <button type="button" onClick={copy} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span>{done ? "Đã sao chép" : "Sao chép liên kết"}</span>
    </button>
  );
}

/** Trang cài ứng dụng: tự nhận diện thiết bị và chỉ hiện đúng cách cài cho thiết bị đó. */
export function InstallGuide() {
  const platform = useSyncExternalStore(noopSubscribe, platformNow, (): Platform => "ssr");
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getServerInstallSnapshot);
  const canPrompt = canPromptFrom(state);
  const installed = platform === "installed" || installedFrom(state);

  async function install() {
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success("Đang cài LIFELY lên thiết bị của bạn");
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo />
        <h1 className="text-2xl font-semibold tracking-tight">Cài ứng dụng LIFELY</h1>
        <p className="text-muted-foreground">Có icon ngoài màn hình, mở toàn màn hình như app thật. Miễn phí, không cần App Store.</p>
      </div>

      {platform === "ssr" && <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-busy="true" />}

      {installed && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="font-medium">LIFELY đã được cài trên thiết bị này.</p>
          <Link href="/open" className={cn(buttonVariants({ size: "lg" }), "w-full")}>Mở ứng dụng</Link>
        </section>
      )}

      {!installed && platform === "in-app" && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="font-medium">Bạn đang mở trong trình duyệt của một app khác (Zalo, Facebook...), nơi này không cài được.</p>
          <ol className="space-y-3">
            <Step n={1}>Bấm nút <strong>⋯</strong> hoặc <ExternalLink className="inline size-4 align-text-bottom" aria-hidden /> ở góc màn hình.</Step>
            <Step n={2}>Chọn <strong>Mở bằng trình duyệt</strong> (Safari trên iPhone, Chrome trên Android).</Step>
          </ol>
          <CopyLink />
        </section>
      )}

      {!installed && platform === "ios-other" && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="font-medium">Trên iPhone/iPad, hãy mở trang này bằng <strong>Safari</strong> để cài.</p>
          <CopyLink />
          <p className="text-sm text-muted-foreground">Sao chép xong, mở Safari, dán vào thanh địa chỉ rồi làm theo 3 bước hiện ra.</p>
        </section>
      )}

      {!installed && platform === "ios-safari" && (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="font-medium">Cài trên iPhone/iPad chỉ với 3 chạm:</p>
          <ol className="space-y-4">
            <Step n={1}>Bấm nút <Share className="inline size-5 align-text-bottom text-primary" aria-hidden /> <strong>Chia sẻ</strong> ở thanh dưới của Safari.</Step>
            <Step n={2}>Kéo xuống, chọn <PlusSquare className="inline size-5 align-text-bottom text-primary" aria-hidden /> <strong>Thêm vào Màn hình chính</strong>.</Step>
            <Step n={3}>Bấm <strong>Thêm</strong> ở góc trên bên phải.</Step>
          </ol>
          <div className="flex flex-col items-center gap-1 text-primary" aria-hidden>
            <span className="text-sm font-medium">Nút Chia sẻ ở đây</span>
            <ArrowDown className="size-8 animate-bounce" />
          </div>
        </section>
      )}

      {!installed && (platform === "android" || platform === "desktop") && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {canPrompt ? (
            <>
              <p className="font-medium">Bấm nút dưới đây để cài, một chạm là xong.</p>
              <button type="button" onClick={install} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                <Download aria-hidden /> Cài ứng dụng
              </button>
            </>
          ) : platform === "android" ? (
            <>
              <p className="font-medium">Cài bằng Chrome:</p>
              <ol className="space-y-3">
                <Step n={1}>Bấm nút <MoreVertical className="inline size-5 align-text-bottom text-primary" aria-hidden /> ở góc trên bên phải Chrome.</Step>
                <Step n={2}>Chọn <strong>Cài đặt ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</Step>
              </ol>
              <p className="text-sm text-muted-foreground">Nếu không thấy, hãy mở trang này bằng Chrome.</p>
            </>
          ) : (
            <p className="text-muted-foreground">Hãy quét mã QR bằng điện thoại để cài LIFELY, hoặc dùng bản web ngay bên dưới.</p>
          )}
        </section>
      )}

      {platform !== "ssr" && (
        <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "self-center text-muted-foreground")}>Dùng bản web, không cần cài</Link>
      )}
    </main>
  );
}

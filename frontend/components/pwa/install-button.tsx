"use client";

import { Download, Share, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import {
  canPromptFrom, getInstallSnapshot, getServerInstallSnapshot, installedFrom, promptInstall, subscribeInstall,
} from "@/lib/pwa-install";
import { isIosDevice, isStandaloneDisplay } from "@/lib/pwa";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};
const clientFlags = () => {
  const standalone = isStandaloneDisplay(
    window.matchMedia?.("(display-mode: standalone)").matches ?? false,
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
  const ios = isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
  return `${standalone ? 1 : 0}${ios ? 1 : 0}`;
};

/**
 * Nút "Cài ứng dụng". Chỉ hiện khi thật sự cài được:
 *  - Chrome/Edge/Android: khi trình duyệt cho phép cài (bấm là mở hộp thoại cài đặt).
 *  - iPhone/iPad: hiện hướng dẫn "Chia sẻ → Thêm vào Màn hình chính" (iOS không có hộp thoại tự động).
 * Ẩn khi đã chạy như ứng dụng đã cài. Không hiện gì trên máy chủ để tránh lệch giao diện.
 */
export function InstallButton({ compact = false, className }: { compact?: boolean; className?: string }) {
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getServerInstallSnapshot);
  const flags = useSyncExternalStore(noopSubscribe, clientFlags, () => "00");
  const [help, setHelp] = useState(false);

  const standalone = flags[0] === "1";
  const ios = flags[1] === "1";
  const canPrompt = canPromptFrom(state);
  if (standalone || installedFrom(state) || (!canPrompt && !ios)) return null;

  async function onClick() {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "accepted") toast.success("Đang cài LIFELY lên thiết bị của bạn");
      return;
    }
    setHelp((h) => !h);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={ios && !canPrompt ? help : undefined}
        aria-label="Cài ứng dụng LIFELY"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), compact && "size-9 px-0", className)}
      >
        <Download aria-hidden />
        {!compact && <span>Cài ứng dụng</span>}
      </button>
      {help && !canPrompt && (
        <div role="status" className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-border bg-card p-4 text-sm shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">Cài LIFELY trên iPhone/iPad</p>
            <button type="button" onClick={() => setHelp(false)} aria-label="Đóng hướng dẫn" className="rounded p-0.5 hover:bg-muted">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Mở trang này bằng <strong>Safari</strong>.</li>
            <li>Bấm nút <Share className="inline size-4 align-text-bottom" aria-hidden /> <strong>Chia sẻ</strong>.</li>
            <li>Chọn <strong>Thêm vào Màn hình chính</strong>.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

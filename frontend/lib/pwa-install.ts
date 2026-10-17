"use client";

/**
 * Giữ sự kiện `beforeinstallprompt` của trình duyệt ở cấp module để các nút "Cài ứng dụng" (thanh trên cùng, menu di động...)
 * dùng chung và không bị lỡ sự kiện nếu nó bắn trước khi nút được hiển thị.
 * Sự kiện này chỉ có trên Chrome/Edge/Android khi ứng dụng đủ điều kiện cài; Safari/iOS không có.
 */

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
let installed = false;
let snapshot = "00";
const subscribers = new Set<() => void>();

function publish() {
  snapshot = `${deferred ? 1 : 0}${installed ? 1 : 0}`;
  subscribers.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // dùng nút của LIFELY thay cho thanh mời cài mặc định
    deferred = e as InstallPromptEvent;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    publish();
  });
}

export function subscribeInstall(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
export const getInstallSnapshot = (): string => snapshot;
export const getServerInstallSnapshot = (): string => "00";
export const canPromptFrom = (s: string): boolean => s[0] === "1";
export const installedFrom = (s: string): boolean => s[1] === "1";

/** Mở hộp thoại cài đặt của trình duyệt. Trả về kết quả người dùng chọn, hoặc null nếu chưa thể cài. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
  const e = deferred;
  if (!e) return null;
  deferred = null; // mỗi sự kiện chỉ dùng được một lần
  publish();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome;
}

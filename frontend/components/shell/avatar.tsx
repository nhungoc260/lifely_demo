"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { toApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function initialsOf(name?: string | null): string {
  return (name ?? "").split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "·";
}

/** Ảnh đại diện; nếu chưa có ảnh thì hiện chữ cái đầu của tên. Truyền className để đổi cỡ và màu. */
export function Avatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  const base = "grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-bold text-primary-foreground";
  // eslint-disable-next-line @next/next/no-img-element -- ảnh data: nhỏ do người dùng tải lên
  return src ? <img src={src} alt="" className={cn(base, "object-cover", className)} /> : <span className={cn(base, className)} aria-hidden>{initialsOf(name)}</span>;
}

/** Cắt vuông, thu nhỏ còn 128px và nén JPEG để vừa giới hạn lưu trữ (khoảng 15KB). */
export async function fileToAvatarDataUrl(file: File, size = 128): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= 19000) return url;
  }
  throw new Error("Ảnh quá phức tạp, hãy chọn ảnh khác");
}

/** Chọn ảnh từ thư viện hoặc máy ảnh để đổi ảnh đại diện; có nút xóa ảnh. */
export function AvatarEditor({ className }: { className?: string }) {
  const { user, setAvatar } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Hãy chọn một tệp ảnh"); return; }
    let url: string;
    try { url = await fileToAvatarDataUrl(file); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Không đọc được ảnh"); return; }
    setBusy(true);
    try { await setAvatar(url); toast.success("Đã cập nhật ảnh đại diện"); }
    catch (err) { toast.error(toApiError(err).message); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await setAvatar(null); toast.success("Đã xóa ảnh đại diện"); }
    catch (err) { toast.error(toApiError(err).message); }
    finally { setBusy(false); }
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative">
        <Avatar src={user?.avatarUrl} name={user?.fullName} className="size-20 text-2xl" />
        <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="Đổi ảnh đại diện"
          className="press absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
      </div>
      <div className="text-sm">
        <p className="font-medium">Ảnh đại diện</p>
        <p className="text-xs text-muted-foreground">Chọn ảnh mặt của bạn để người nhận lời và bệnh viện dễ nhận ra.</p>
        {user?.avatarUrl && <button type="button" onClick={() => void remove()} disabled={busy} className="mt-1 text-xs font-medium text-critical hover:underline">Xóa ảnh</button>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e)} />
    </div>
  );
}

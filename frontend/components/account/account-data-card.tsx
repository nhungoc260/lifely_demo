"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { toApiError, authFetch } from "@/lib/api";
import { accountApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";

/** Quyền của chủ dữ liệu: tải toàn bộ dữ liệu của mình, và xóa tài khoản (ẩn danh hóa). */
export function AccountDataCard() {
  const router = useRouter();
  const { signOut, role } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    try {
      const res = await authFetch(`/api/users/me/export`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "failed");
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lifely-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải dữ liệu của bạn xuống");
    } catch { toast.error("Không tải được dữ liệu của bạn. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await accountApi.delete(password);
      toast.success("Tài khoản của bạn đã được xóa. Cảm ơn bạn đã đồng hành cùng LIFELY.");
      signOut();
      router.replace("/");
    } catch (e) { setError(toApiError(e).message); } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Dữ liệu của bạn</CardTitle></CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div>
          <p className="font-medium">Tải về một bản sao</p>
          <p className="mt-1 text-muted-foreground">Nhận toàn bộ dữ liệu LIFELY lưu về bạn dưới dạng tệp JSON: hồ sơ, cài đặt riêng tư, lịch sử hiến máu, các lần kết nối và yêu cầu.</p>
          <Button variant="outline" className="mt-3" onClick={download} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Download />} Tải dữ liệu của tôi</Button>
        </div>
        <div className="border-t border-border pt-5">
          <p className="font-medium">Xóa tài khoản của tôi</p>
          <p className="mt-1 text-muted-foreground">Thông tin cá nhân, vị trí và lịch sử hiến máu của bạn sẽ bị xóa và bạn không thể đăng nhập nữa. Các yêu cầu đang mở do bạn tạo sẽ bị hủy. Không thể hoàn tác.</p>
          {role === "ORGANIZATION" ? <p className="mt-3 rounded-xl bg-muted p-3">Tài khoản tổ chức gắn với các hồ sơ đã xác minh. Vui lòng liên hệ nhân viên của chúng tôi để đóng tài khoản.</p> : (
            <Dialog.Root open={open} onOpenChange={(o) => { if (!busy) { setOpen(o); setPassword(""); setError(null); } }}>
              <Dialog.Trigger asChild><Button variant="outline" className="mt-3 border-critical/40 text-critical hover:bg-critical/5"><Trash2 /> Xóa tài khoản</Button></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl focus:outline-none">
                  <Dialog.Title className="text-lg font-semibold">Xóa tài khoản của bạn?</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-muted-foreground">Thao tác này xóa vĩnh viễn dữ liệu cá nhân của bạn. Nhập mật khẩu để xác nhận.</Dialog.Description>
                  <div className="mt-4"><Field label="Mật khẩu" htmlFor="del-pass" error={error ?? undefined}><Input id="del-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} /></Field></div>
                  <div className="mt-6 flex justify-end gap-2">
                    <Dialog.Close asChild><Button variant="outline" disabled={busy}>Giữ tài khoản</Button></Dialog.Close>
                    <Button className="bg-critical text-white hover:bg-critical/90" disabled={busy || password.length === 0} onClick={remove}>{busy && <Loader2 className="animate-spin" />} Xóa vĩnh viễn</Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

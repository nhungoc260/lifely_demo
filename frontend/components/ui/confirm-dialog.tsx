"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Nếu có, hiển thị ô nhập lý do và truyền vào onConfirm. */
  reasonLabel?: string;
  reasonRequired?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

/** Hộp thoại xác nhận có thể truy cập (focus trap, Esc, aria) cho các hành động quan trọng. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, destructive, reasonLabel, reasonRequired, onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  async function handle() {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
      setReason("");
    } catch {
      /* người gọi đã hiện thông báo lỗi; giữ hộp thoại mở để thử lại */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">{description}</Dialog.Description>
          {reasonLabel && (
            <div className="mt-4 space-y-1.5">
              <label htmlFor="confirm-reason" className="text-sm font-medium">{reasonLabel}</label>
              <Textarea id="confirm-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={busy}>Keep it</Button>
            </Dialog.Close>
            <Button
              onClick={handle}
              disabled={busy || (!!reasonRequired && reason.trim().length === 0)}
              className={destructive ? "bg-critical text-white hover:bg-critical/90" : undefined}
            >
              {busy && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

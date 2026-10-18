"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LifeBuoy, LogOut, Moon } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { InstallButton } from "@/components/pwa/install-button";
import { type NavItem } from "@/components/shell/nav";
import { IconTile, ListGroup, ListRow } from "@/components/ui/mobile";
import { UnreadBadge } from "@/components/shell/parts";

const TINTS = ["rose", "sky", "emerald", "amber", "violet", "slate"] as const;

/** Tab "Thêm" trên điện thoại: mọi mục còn lại của khu vực làm việc, cài đặt ứng dụng và đăng xuất. */
export function MoreSheet({
  open, onOpenChange, items, unread, user, roleTitle, onSignOut,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; items: NavItem[]; unread: number;
  user: { fullName: string; email: string } | null; roleTitle: string; onSignOut: () => void;
}) {
  const close = () => onOpenChange(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl bg-surface shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom">
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden />
          <div className="shrink-0 px-5 pb-3 pt-3">
            <Dialog.Title className="text-xl font-bold tracking-tight">Thêm</Dialog.Title>
            <Dialog.Description className="truncate text-xs text-muted-foreground">{user ? `${user.fullName} · ${roleTitle}` : roleTitle}</Dialog.Description>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {items.length > 0 && (
              <ListGroup>
                {items.map((it, i) => (
                  <div key={it.href} onClick={close}>
                    <ListRow icon={it.icon} tint={TINTS[i % TINTS.length]} label={it.label} href={it.href} trailing={it.badge === "unread" && unread > 0 ? <UnreadBadge n={unread} /> : undefined} />
                  </div>
                ))}
              </ListGroup>
            )}
            <ListGroup title="Ứng dụng">
              <div className="flex min-h-[52px] items-center gap-3 px-4 py-2.5">
                <IconTile icon={Moon} tint="violet" />
                <span className="flex-1 text-[15px] font-medium">Giao diện</span>
                <ThemeToggle />
              </div>
              <div className="px-4 py-2.5 empty:hidden"><InstallButton className="w-full" /></div>
              <ListRow icon={LifeBuoy} tint="amber" label="Trợ giúp và hỗ trợ" onClick={() => { close(); window.dispatchEvent(new Event("lifely:open-help")); }} />
            </ListGroup>
            <ListGroup>
              <ListRow icon={LogOut} danger label="Đăng xuất" chevron={false} onClick={() => { close(); onSignOut(); }} />
            </ListGroup>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

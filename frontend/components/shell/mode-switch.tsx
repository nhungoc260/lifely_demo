"use client";

import { Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { toApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { homeFor, useAuth, useOptionalAuth } from "@/providers/auth-provider";
import type { Role } from "@/types/domain";

/** Chuyển giữa "Tôi hiến máu" và "Tôi cần máu". Lần đầu sẽ bật thêm vai trò còn lại cho tài khoản (cần backend /api/users/me/roles). */
export function useModeSwitch() {
  const { user, role, switchMode, enableRole } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const eligible = !!user && !user.roles.includes("ORGANIZATION") && !user.roles.includes("ADMIN") && (role === "DONOR" || role === "REQUESTER");
  const target: Role = role === "DONOR" ? "REQUESTER" : "DONOR";
  const has = !!user?.roles.includes(target);
  const label = target === "REQUESTER" ? "Tôi cần máu" : "Tôi hiến máu";

  async function go() {
    if (busy) return;
    setBusy(true);
    try {
      if (has) switchMode(target); else await enableRole(target);
      router.push(homeFor(target));
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }
  return { eligible, target, label, has, busy, go };
}

/** Một dòng nút chuyển chế độ, dùng trong menu. */
export function ModeSwitchRow({ className }: { className?: string }) {
  return useOptionalAuth() ? <RowInner className={className} /> : null;
}

function RowInner({ className }: { className?: string }) {
  const sw = useModeSwitch();
  if (!sw.eligible) return null;
  return (
    <button type="button" role="menuitem" disabled={sw.busy} onClick={() => void sw.go()} className={cn(className, "disabled:opacity-60")}>
      <Repeat className="size-4 text-muted-foreground" aria-hidden />Chuyển sang “{sw.label}”
    </button>
  );
}

/** Thẻ gợi ý trên Trang chủ app. */
export function ModeSwitchBanner({ hint }: { hint: string }) {
  return useOptionalAuth() ? <BannerInner hint={hint} /> : null;
}

function BannerInner({ hint }: { hint: string }) {
  const sw = useModeSwitch();
  if (!sw.eligible) return null;
  return (
    <button type="button" disabled={sw.busy} onClick={() => void sw.go()} className="press mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left disabled:opacity-60">
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Repeat className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{hint}</span><span className="block text-xs text-muted-foreground">Chuyển sang “{sw.label}” bằng cùng một tài khoản</span></span>
    </button>
  );
}

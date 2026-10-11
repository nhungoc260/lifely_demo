"use client";

import { Building2, Droplets, HeartHandshake } from "lucide-react";

import { cn } from "@/lib/utils";

export const ROLES = [
  { value: "DONOR", title: "Người hiến máu", desc: "Được kết nối với các yêu cầu ở gần", icon: Droplets },
  { value: "REQUESTER", title: "Người cần máu", desc: "Tôi cần máu cho bệnh nhân", icon: HeartHandshake },
  { value: "ORGANIZATION", title: "Tổ chức", desc: "Bệnh viện hoặc trung tâm máu", icon: Building2 },
] as const;

export type RoleValue = (typeof ROLES)[number]["value"];

export function isRoleValue(v: string | null | undefined): v is RoleValue {
  return ROLES.some((r) => r.value === v);
}

/** Ba thẻ chọn vai trò, dùng chung cho đăng ký thường và bước hoàn tất hồ sơ Google. */
export function RolePicker({ name, value, onChange }: { name: string; value: RoleValue; onChange: (v: RoleValue) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Tôi tham gia với vai trò</legend>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
        {ROLES.map((r) => (
          <label key={r.value} className={cn("cursor-pointer rounded-xl border border-border bg-card p-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", value === r.value && "border-primary bg-secondary")}>
            <input type="radio" className="sr-only" name={name} value={r.value} checked={value === r.value} onChange={() => onChange(r.value)} />
            <r.icon className={cn("mb-2 size-5", value === r.value ? "text-primary" : "text-muted-foreground")} aria-hidden />
            <span className="block font-medium">{r.title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{r.desc}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

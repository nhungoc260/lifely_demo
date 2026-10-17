"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { ctaHref, type CtaIntent } from "@/lib/cta";
import { useAuth } from "@/providers/auth-provider";

/** Link của nút ở trang chủ: tự đổi đích theo vai trò khi đã đăng nhập (xem `ctaHref`). */
export function CtaLink({ intent, ...props }: { intent: CtaIntent } & Omit<ComponentProps<typeof Link>, "href">) {
  const { status, role } = useAuth();
  return <Link {...props} href={ctaHref(status === "authenticated" ? role : null, intent)} />;
}

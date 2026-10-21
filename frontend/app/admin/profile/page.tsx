"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { AvatarEditor } from "@/components/shell/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";

/** Hồ sơ của quản trị viên: ảnh đại diện, thông tin tài khoản đang đăng nhập và nút đăng xuất (dùng được cả ở app lẫn web). */
export default function AdminProfile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const logout = () => { signOut(); router.replace("/login"); };
  return (
    <>
      <PageHeader title="Hồ sơ quản trị" description="Ảnh đại diện và thông tin tài khoản quản trị của bạn." />
      <div className="grid max-w-2xl gap-5">
        <Card><CardContent className="pt-6"><AvatarEditor /></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Tài khoản</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {([["Họ tên", user?.fullName], ["Email", user?.email], ["Số điện thoại", user?.phone || "–"], ["Vai trò", "Quản trị viên"]] as const).map(([k, v]) => (
              <div key={k} className="flex gap-4"><span className="w-32 shrink-0 text-muted-foreground">{k}</span><span className="min-w-0 flex-1 break-words font-medium">{v ?? "–"}</span></div>
            ))}
          </CardContent>
        </Card>
        <Button type="button" variant="outline" size="lg" onClick={logout} className="w-full border-critical/40 text-critical hover:bg-critical/10">
          <LogOut aria-hidden />Đăng xuất
        </Button>
      </div>
    </>
  );
}

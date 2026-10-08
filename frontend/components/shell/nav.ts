import {
  Bell, ClipboardList, FilePlus2, HeartPulse, History, LayoutDashboard, Map, ScrollText, ShieldAlert,
  Building2, MessageSquare, UserRound, Users, type LucideIcon,
} from "lucide-react";

import type { Role } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hiện trong thanh điều hướng dưới (mobile). */
  mobile?: boolean;
  badge?: "unread";
}

export const NAV: Record<Role, NavItem[]> = {
  DONOR: [
    { href: "/donor/dashboard", label: "Trang chủ", icon: LayoutDashboard, mobile: true },
    { href: "/donor/requests", label: "Yêu cầu", icon: HeartPulse, mobile: true },
    { href: "/map", label: "Bản đồ", icon: Map, mobile: true },
    { href: "/donor/notifications", label: "Thông báo", icon: Bell, mobile: true, badge: "unread" },
    { href: "/donor/profile", label: "Hồ sơ", icon: UserRound, mobile: true },
    { href: "/donor/history", label: "Lịch sử", icon: History },
  ],
  REQUESTER: [
    { href: "/requester/dashboard", label: "Trang chủ", icon: LayoutDashboard, mobile: true },
    { href: "/requester/requests", label: "Yêu cầu của tôi", icon: ClipboardList, mobile: true },
    { href: "/requester/requests/create", label: "Yêu cầu mới", icon: FilePlus2, mobile: true },
    { href: "/map", label: "Bản đồ", icon: Map, mobile: true },
    { href: "/requester/notifications", label: "Thông báo", icon: Bell, mobile: true, badge: "unread" },
    { href: "/requester/account", label: "Dữ liệu của tôi", icon: UserRound },
  ],
  ORGANIZATION: [
    { href: "/organization/dashboard", label: "Trang chủ", icon: LayoutDashboard, mobile: true },
    { href: "/organization/requests", label: "Yêu cầu", icon: ClipboardList, mobile: true },
    { href: "/organization/requests/create", label: "Yêu cầu mới", icon: FilePlus2 },
    { href: "/map", label: "Bản đồ", icon: Map, mobile: true },
    { href: "/organization/notifications", label: "Thông báo", icon: Bell, mobile: true, badge: "unread" },
    { href: "/organization/profile", label: "Tổ chức", icon: Building2 },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
    { href: "/admin/requests", label: "Yêu cầu", icon: ClipboardList, mobile: true },
    { href: "/admin/organizations", label: "Tổ chức", icon: Building2, mobile: true },
    { href: "/admin/users", label: "Người dùng", icon: Users, mobile: true },
    { href: "/admin/reports", label: "Báo cáo vi phạm", icon: ShieldAlert, mobile: true },
    { href: "/admin/messages", label: "Tin nhắn", icon: MessageSquare },
    { href: "/admin/audit", label: "Nhật ký hoạt động", icon: ScrollText },
  ],
};

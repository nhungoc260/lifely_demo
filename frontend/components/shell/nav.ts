import {
  Activity, BarChart3, Bell, CalendarDays, ClipboardList, Droplets, FilePlus2, HeartPulse, History, LayoutDashboard, Map, ScrollText, ShieldAlert,
  Building2, HandHelping, MessageSquare, ShieldCheck, UserRound, Users, type LucideIcon,
} from "lucide-react";

import type { Role } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hiện trong thanh điều hướng dưới (mobile). */
  mobile?: boolean;
  badge?: "unread";
  /** Nhãn ngắn dùng ở thanh điều hướng dưới (mobile) khi nhãn đầy đủ quá dài. */
  short?: string;
}

/** Nhận diện từng vai trò: nhãn, biểu tượng và mô tả ngắn hiển thị ở thanh bên để biết mình đang ở không gian nào. */
export const ROLE_META: Record<Role, { title: string; hint: string; icon: LucideIcon }> = {
  DONOR: { title: "Người hiến máu", hint: "Nhận và phản hồi yêu cầu gần bạn", icon: HeartPulse },
  REQUESTER: { title: "Người cần máu", hint: "Tạo và theo dõi yêu cầu máu", icon: HandHelping },
  ORGANIZATION: { title: "Tổ chức y tế", hint: "Điều phối yêu cầu của cơ sở", icon: Building2 },
  ADMIN: { title: "Quản trị viên", hint: "Giám sát và duyệt hệ thống", icon: ShieldCheck },
};

export const NAV: Record<Role, NavItem[]> = {
  DONOR: [
    { href: "/donor/dashboard", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
    { href: "/donor/requests", label: "Yêu cầu", icon: HeartPulse, mobile: true },
    { href: "/map", label: "Bản đồ", icon: Map, mobile: true },
    { href: "/donor/notifications", label: "Thông báo", icon: Bell, mobile: true, badge: "unread" },
    { href: "/donor/profile", label: "Hồ sơ", icon: UserRound, mobile: true },
    { href: "/donor/health", label: "Sức khỏe của tôi", icon: Activity },
    { href: "/donor/appointments", label: "Đặt lịch hiến", icon: CalendarDays },
    { href: "/donor/history", label: "Lịch sử", icon: History },
  ],
  REQUESTER: [
    { href: "/requester/dashboard", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
    { href: "/requester/requests", label: "Yêu cầu của tôi", icon: ClipboardList, mobile: true },
    { href: "/requester/requests/create", label: "Yêu cầu mới", icon: FilePlus2, mobile: true },
    { href: "/map", label: "Bản đồ", icon: Map, mobile: true },
    { href: "/requester/notifications", label: "Thông báo", icon: Bell, mobile: true, badge: "unread" },
    { href: "/requester/account", label: "Dữ liệu của tôi", icon: UserRound },
  ],
  ORGANIZATION: [
    { href: "/organization/dashboard", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
    { href: "/organization/requests", label: "Yêu cầu", icon: ClipboardList, mobile: true },
    { href: "/organization/requests/create", label: "Yêu cầu mới", icon: FilePlus2 },
    { href: "/organization/appointments", label: "Lịch hiến", icon: CalendarDays },
    { href: "/organization/inventory", label: "Kho máu", icon: Droplets },
    { href: "/organization/donations", label: "Lịch sử hiến", icon: HeartPulse },
    { href: "/organization/stats", label: "Thống kê", icon: BarChart3 },
    { href: "/map", label: "Bản đồ", icon: Map, mobile: true },
    { href: "/organization/notifications", label: "Thông báo", icon: Bell, mobile: true, badge: "unread" },
    { href: "/organization/staff", label: "Nhân viên", icon: Users },
    { href: "/organization/profile", label: "Tổ chức", icon: Building2 },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
    { href: "/admin/requests", label: "Yêu cầu", icon: ClipboardList, mobile: true },
    { href: "/admin/organizations", label: "Tổ chức", icon: Building2, mobile: true },
    { href: "/admin/users", label: "Người dùng", icon: Users, mobile: true },
    { href: "/admin/reports", label: "Báo cáo vi phạm", short: "Báo cáo", icon: ShieldAlert, mobile: true },
    { href: "/admin/messages", label: "Tin nhắn", icon: MessageSquare },
    { href: "/admin/audit", label: "Nhật ký hoạt động", icon: ScrollText },
  ],
};

/** Kiểu giao diện theo vai trò: người dùng cuối (hiến máu, cần máu) là website công khai có thanh menu ngang;
 *  tổ chức y tế và quản trị viên là khung làm việc có thanh bên. */
export const TOPNAV_ROLES: Role[] = ["DONOR", "REQUESTER"];

export interface TopNav {
  /** Liên kết chính trên thanh menu ngang. */
  links: NavItem[];
  bell: string;
  /** Mục trong menu tài khoản. */
  menu: NavItem[];
  cta?: { href: string; label: string };
}

export const TOPNAV: Partial<Record<Role, TopNav>> = {
  DONOR: {
    links: [
      { href: "/donor/dashboard", label: "Trang chủ", icon: LayoutDashboard },
      { href: "/donor/requests", label: "Yêu cầu", icon: HeartPulse },
      { href: "/map", label: "Bản đồ", icon: Map },
      { href: "/donor/history", label: "Lịch sử", icon: History },
    ],
    bell: "/donor/notifications",
    menu: [
      { href: "/donor/profile", label: "Hồ sơ của tôi", icon: UserRound },
      { href: "/donor/health", label: "Sức khỏe của tôi", icon: Activity },
      { href: "/donor/appointments", label: "Đặt lịch hiến", icon: CalendarDays },
    ],
  },
  REQUESTER: {
    links: [
      { href: "/requester/dashboard", label: "Trang chủ", icon: LayoutDashboard },
      { href: "/requester/requests", label: "Yêu cầu của tôi", icon: ClipboardList },
      { href: "/map", label: "Bản đồ", icon: Map },
    ],
    bell: "/requester/notifications",
    menu: [{ href: "/requester/account", label: "Dữ liệu của tôi", icon: UserRound }],
    cta: { href: "/requester/requests/create", label: "Tạo yêu cầu máu" },
  },
};

/** Mục cha chỉ active khi không có mục con khớp tốt hơn. */
export function isActive(pathname: string, item: NavItem, all: NavItem[]) {
  if (pathname === item.href) return true;
  const better = all.some((o) => o !== item && o.href.startsWith(item.href + "/") && pathname.startsWith(o.href));
  return pathname.startsWith(item.href + "/") && !better;
}

export function initialsOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

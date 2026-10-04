import {
  Bell, ClipboardList, FilePlus2, HeartPulse, History, LayoutDashboard, Map, ScrollText, ShieldAlert,
  Building2, UserRound, Users, type LucideIcon,
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
    { href: "/donor/dashboard", label: "Home", icon: LayoutDashboard, mobile: true },
    { href: "/donor/requests", label: "Requests", icon: HeartPulse, mobile: true },
    { href: "/map", label: "Map", icon: Map, mobile: true },
    { href: "/donor/notifications", label: "Notifications", icon: Bell, mobile: true, badge: "unread" },
    { href: "/donor/profile", label: "Profile", icon: UserRound, mobile: true },
    { href: "/donor/history", label: "History", icon: History },
  ],
  REQUESTER: [
    { href: "/requester/dashboard", label: "Home", icon: LayoutDashboard, mobile: true },
    { href: "/requester/requests", label: "My requests", icon: ClipboardList, mobile: true },
    { href: "/requester/requests/create", label: "New request", icon: FilePlus2, mobile: true },
    { href: "/map", label: "Map", icon: Map, mobile: true },
    { href: "/requester/notifications", label: "Notifications", icon: Bell, mobile: true, badge: "unread" },
  ],
  ORGANIZATION: [
    { href: "/organization/dashboard", label: "Home", icon: LayoutDashboard, mobile: true },
    { href: "/organization/requests", label: "Requests", icon: ClipboardList, mobile: true },
    { href: "/organization/requests/create", label: "New request", icon: FilePlus2 },
    { href: "/map", label: "Map", icon: Map, mobile: true },
    { href: "/organization/notifications", label: "Notifications", icon: Bell, mobile: true, badge: "unread" },
    { href: "/organization/profile", label: "Organization", icon: Building2 },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
    { href: "/admin/requests", label: "Requests", icon: ClipboardList, mobile: true },
    { href: "/admin/organizations", label: "Organizations", icon: Building2, mobile: true },
    { href: "/admin/users", label: "Users", icon: Users, mobile: true },
    { href: "/admin/reports", label: "Reports", icon: ShieldAlert, mobile: true },
    { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  ],
};

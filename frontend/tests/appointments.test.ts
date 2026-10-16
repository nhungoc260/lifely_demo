import { describe, expect, it } from "vitest";

import { APPOINTMENT_STATUS_LABEL, ORG_ACTIONS } from "@/lib/appointments";
import type { AppointmentStatus } from "@/types/domain";

const ALL: AppointmentStatus[] = ["BOOKED", "CHECKED_IN", "SCREENED", "DONATED", "DEFERRED", "NO_SHOW", "CANCELLED"];

describe("lịch hiến máu", () => {
  it("mọi trạng thái đều có nhãn, và 'đã đặt' khác 'đã hiến'", () => {
    for (const s of ALL) expect(APPOINTMENT_STATUS_LABEL[s].length).toBeGreaterThan(3);
    expect(new Set(ALL.map((s) => APPOINTMENT_STATUS_LABEL[s])).size).toBe(ALL.length);
  });

  it("chỉ cho xác nhận 'đã hiến' khi đã qua sàng lọc (không nhảy cóc)", () => {
    for (const s of ALL) {
      const hasDonated = ORG_ACTIONS[s].some((a) => a.action === "DONATED");
      expect(hasDonated).toBe(s === "SCREENED");
    }
  });

  it("trạng thái cuối không còn thao tác nào", () => {
    for (const s of ["DONATED", "DEFERRED", "NO_SHOW", "CANCELLED"] as const) expect(ORG_ACTIONS[s]).toHaveLength(0);
  });
});

describe("điều hướng tới các trang mới", () => {
  it("người hiến mở được Sức khỏe của tôi và Đặt lịch hiến từ menu tài khoản (cả trên điện thoại)", async () => {
    const { TOPNAV } = await import("@/components/shell/nav");
    const hrefs = TOPNAV.DONOR!.menu.map((i) => i.href);
    expect(hrefs).toContain("/donor/health");
    expect(hrefs).toContain("/donor/appointments");
  });

  it("cơ sở y tế có mục Lịch hiến ở thanh bên", async () => {
    const { NAV } = await import("@/components/shell/nav");
    expect(NAV.ORGANIZATION.map((i) => i.href)).toContain("/organization/appointments");
  });
});

import { describe, expect, it } from "vitest";

import { NAV } from "@/components/shell/nav";
import { actorLabel, describeAudit } from "@/lib/audit";

describe("describeAudit (chi tiết nhật ký đọc được)", () => {
  it("dịch khóa và giá trị đã biết sang tiếng Việt", () => {
    expect(describeAudit({ bloodType: "O+", units: 2, urgency: "CRITICAL" })).toBe("Nhóm máu: O+ · Số đơn vị: 2 · Mức độ: Nguy kịch");
    expect(describeAudit({ result: "CONFIRMED_CAN_JOIN" })).toBe("Kết quả liên hệ: Xác nhận có thể tham gia");
    expect(describeAudit({ targetType: "REQUEST", reason: "FAKE_REQUEST" })).toBe("Đối tượng bị báo cáo: Yêu cầu máu · Lý do: Yêu cầu giả");
  });
  it("bỏ qua khóa lạ, đối tượng lồng nhau và mã nội bộ (không lộ dữ liệu thô)", () => {
    expect(describeAudit({ token: "abc", password: "x", nested: { a: 1 }, requestId: "uuid" })).toBe("");
    expect(describeAudit({ bloodType: "A-", secret: "s" })).toBe("Nhóm máu: A-");
  });
  it("rỗng khi không có metadata", () => {
    expect(describeAudit(null)).toBe("");
    expect(describeAudit(undefined)).toBe("");
  });
});

describe("actorLabel (người thực hiện)", () => {
  it("ưu tiên tên kèm email, rồi email, rồi tài khoản đã xóa, rồi hệ thống", () => {
    expect(actorLabel("Quản trị viên", "admin@x.vn", "11111111-aaaa")).toEqual({ primary: "Quản trị viên", secondary: "admin@x.vn" });
    expect(actorLabel(null, "a@x.vn", "11111111-aaaa")).toEqual({ primary: "a@x.vn", secondary: "" });
    expect(actorLabel(null, null, "11111111-aaaa")).toEqual({ primary: "Tài khoản đã xóa", secondary: "11111111" });
    expect(actorLabel(null, null, null)).toEqual({ primary: "Hệ thống", secondary: "" });
  });
});

describe("điều hướng của admin", () => {
  const hrefs = NAV.ADMIN.map((i) => i.href);
  it("có đủ các mục quản trị mới", () => {
    for (const h of ["/admin/inventory", "/admin/appointments", "/admin/operations", "/admin/notifications", "/admin/audit"]) expect(hrefs).toContain(h);
  });
  it("mục Thông báo có huy hiệu chưa đọc để thanh trên cùng hiện chuông", () => {
    expect(NAV.ADMIN.find((i) => i.href === "/admin/notifications")?.badge).toBe("unread");
  });
});

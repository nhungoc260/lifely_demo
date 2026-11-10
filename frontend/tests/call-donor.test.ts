import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CallDonor } from "@/components/requests/call-donor";
import type { RequestMatchEntry } from "@/types/domain";

const base: RequestMatchEntry = {
  matchId: "m1", label: "Người hiến #1", distanceKm: 2, matchingScore: 90, status: "ACCEPTED",
  respondedAt: null, donorName: "Nguyễn A", donorPhone: "0901234567", facilityVerified: false,
  verifiedByName: null, contactResult: "NOT_CONTACTED", contactResultAt: null,
  invitedAt: null, lastRemindedAt: null, remindCount: 0,
};
const html = (m: Partial<RequestMatchEntry>) => renderToStaticMarkup(createElement(CallDonor, { m: { ...base, ...m }, onChanged: () => {} }));

describe("nút Gọi người hiến", () => {
  it("người đã nhận lời có số hợp lệ: có liên kết tel: và ô chọn kết quả", () => {
    const out = html({});
    expect(out).toContain('href="tel:0901234567"');
    expect(out).toContain("Gọi người hiến");
    expect(out).toContain("Chưa liên hệ");
    expect(out).toContain("Xác nhận có thể tham gia");
  });
  it("thiếu số hoặc số sai: không có liên kết tel:, hiện thông báo dễ hiểu", () => {
    for (const phone of [null, "abc", "123"]) {
      const out = html({ donorPhone: phone });
      expect(out).not.toContain("tel:");
      expect(out).toContain("chưa có số điện thoại hợp lệ");
    }
  });
  it("người đã từ chối hoặc lượt đã hủy: không hiển thị gì (máy chủ cũng không trả số)", () => {
    for (const status of ["REJECTED", "CANCELLED", "EXPIRED"] as const) {
      expect(html({ status })).toBe("");
    }
  });
  it("người hiến phù hợp đang chờ hoặc đã được mời: hiện nút gọi", () => {
    for (const status of ["PENDING", "CONTACTED"] as const) {
      expect(html({ status })).toContain("tel:0901234567");
    }
  });
  it("lượt đã hoàn thành vẫn cho ghi nhận liên hệ", () => {
    expect(html({ status: "COMPLETED" })).toContain("tel:0901234567");
  });
});

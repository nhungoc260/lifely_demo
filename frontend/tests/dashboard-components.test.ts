import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DonorStatusBanner } from "@/components/donor/status-banner";
import { JourneyCard } from "@/components/donor/journey-card";
import { HowItWorks } from "@/components/requests/how-it-works";
import { RequesterRequestCard } from "@/components/requests/requester-request-card";
import { donorStatus } from "@/lib/donor-status";
import type { BloodRequest } from "@/types/domain";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("các khối giao diện mới", () => {
  it("khối trạng thái người hiến: chỉ một thông điệp và có công tắc có nhãn", () => {
    const status = donorStatus({ profileComplete: true, available: true, lastDonationDate: "2026-09-20", todayIso: "2026-10-10" });
    const out = html(createElement(DonorStatusBanner, { status, available: true, saving: false, onToggle: () => {} }));
    expect(out).toContain("thời gian nghỉ giữa hai lần hiến");
    expect(out).not.toContain("sẵn sàng hiến máu");   // không nói "sẵn sàng" khi đang nghỉ
    expect(out).toContain('aria-label="Nhận yêu cầu hiến máu"');
    expect(out.match(/<h2/g)).toHaveLength(1);
  });

  it("khối trạng thái hiện khung chờ khi chưa có dữ liệu", () => {
    expect(html(createElement(DonorStatusBanner, { status: null, available: false, saving: false, onToggle: () => {} }))).not.toContain("<h2");
  });

  it("hồ sơ chưa đủ: có nút dẫn tới trang hồ sơ", () => {
    const status = donorStatus({ profileComplete: false, available: false, lastDonationDate: null, todayIso: "2026-10-10" });
    const out = html(createElement(DonorStatusBanner, { status, available: false, saving: false, onToggle: () => {} }));
    expect(out).toContain('href="/donor/profile"');
    expect(out).toContain("Hoàn tất hồ sơ");
  });

  it("thẻ mốc hiến máu nói bằng lời thường", () => {
    const out = html(createElement(JourneyCard, { totalDonations: 5 }));
    expect(out).toContain("Mốc tiếp theo: Người cứu sinh mạng");
    expect(out).toContain("Còn 5 lần hiến nữa");
    expect(out).toContain('href="/donor/history"');
  });

  it("hướng dẫn 3 bước cho người mới kèm tuyên bố y tế", () => {
    const out = html(createElement(HowItWorks));
    expect(out.match(/<li/g)).toHaveLength(3);
    expect(out).toContain("Quản trị viên xác minh");
    expect(out).toContain("nhân viên y tế quyết định");
  });

  it("thẻ yêu cầu của người cần máu có câu tiến độ và số người đã nhận lời", () => {
    const r = { id: "abc", bloodType: "O-", urgency: "CRITICAL", status: "DONORS_CONTACTED", hospitalName: "Bệnh viện Chợ Rẫy",
      unitsRequired: 2, unitsConfirmed: 0, deadline: "2030-01-01T00:00:00Z" } as unknown as BloodRequest;
    const out = html(createElement(RequesterRequestCard, { r }));
    expect(out).toContain("Chưa có ai nhận lời");
    expect(out).toContain("0/2 người đã nhận lời");
    expect(out).toContain('href="/requester/requests/abc"');
  });

  it("yêu cầu đã hủy hiển thị là đã đóng, không còn đếm ngược", () => {
    const r = { id: "x", bloodType: "A+", urgency: "URGENT", status: "CANCELLED", hospitalName: "Bệnh viện Quân y 175",
      unitsRequired: 2, unitsConfirmed: 0, deadline: "2030-01-01T00:00:00Z" } as unknown as BloodRequest;
    const out = html(createElement(RequesterRequestCard, { r }));
    expect(out).toContain("Đã đóng");
    expect(out).toContain("Yêu cầu đã được hủy.");
  });
});

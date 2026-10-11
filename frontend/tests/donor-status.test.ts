import { describe, expect, it } from "vitest";

import { donorStatus } from "@/lib/donor-status";

const base = { profileComplete: true, available: true, lastDonationDate: null as string | null, todayIso: "2026-10-10" };

describe("trạng thái người hiến máu: chỉ một thông điệp, không mâu thuẫn", () => {
  it("sẵn sàng khi hồ sơ đủ, đang bật và chưa hiến lần nào", () => {
    const s = donorStatus(base);
    expect(s.kind).toBe("READY");
    expect(s.tone).toBe("success");
    expect(s.description).toContain("nhân viên y tế quyết định");
  });

  it("đang nghỉ khi đã bật nhưng mới hiến gần đây: không được nói là sẵn sàng", () => {
    const s = donorStatus({ ...base, lastDonationDate: "2026-09-20" });   // 20 ngày trước, quy tắc 84 ngày
    expect(s.kind).toBe("RESTING");
    expect(s.title).not.toMatch(/sẵn sàng/i);
    expect(s.description).toContain("còn 64 ngày");
    expect(s.description).toContain("không phải kết luận y tế");
  });

  it("sẵn sàng trở lại đúng ngày hết thời gian nghỉ", () => {
    expect(donorStatus({ ...base, lastDonationDate: "2026-07-18" }).kind).toBe("READY");   // đúng 84 ngày
    expect(donorStatus({ ...base, lastDonationDate: "2026-07-19" }).kind).toBe("RESTING");  // còn 1 ngày
  });

  it("đang tắt nhận yêu cầu thì báo tắt, dù đang trong thời gian nghỉ", () => {
    const s = donorStatus({ ...base, available: false, lastDonationDate: "2026-09-20" });
    expect(s.kind).toBe("OFF");
    expect(s.tone).toBe("muted");
  });

  it("hồ sơ chưa đủ được ưu tiên cao nhất và có đường dẫn hoàn tất", () => {
    const s = donorStatus({ ...base, profileComplete: false, available: false });
    expect(s.kind).toBe("INCOMPLETE");
    expect(s.action?.href).toBe("/donor/profile");
  });
});

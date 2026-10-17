import { describe, expect, it } from "vitest";

import { ctaHref } from "@/lib/cta";

describe("ctaHref (nút ở trang chủ)", () => {
  it("khách: giữ hành vi cũ, đi tới đăng ký / trang tạo yêu cầu", () => {
    expect(ctaHref(null, "NEED_BLOOD")).toBe("/requester/requests/create");
    expect(ctaHref(null, "DONATE")).toBe("/register?role=DONOR");
    expect(ctaHref(null, "JOIN_ORG")).toBe("/register?role=ORGANIZATION");
  });
  it("người cần máu và tổ chức bấm 'Tôi cần máu' đi thẳng tới form tạo yêu cầu của mình", () => {
    expect(ctaHref("REQUESTER", "NEED_BLOOD")).toBe("/requester/requests/create");
    expect(ctaHref("ORGANIZATION", "NEED_BLOOD")).toBe("/organization/requests/create");
  });
  it("người hiến bấm 'Tôi muốn hiến máu' đi thẳng tới danh sách yêu cầu gần bạn, không bị bắt đăng ký lại", () => {
    expect(ctaHref("DONOR", "DONATE")).toBe("/donor/requests");
  });
  it("vai trò không làm được việc đó thì về trang chính của chính họ (không đăng ký/đăng nhập lại)", () => {
    expect(ctaHref("DONOR", "NEED_BLOOD")).toBe("/donor/dashboard");
    expect(ctaHref("ADMIN", "NEED_BLOOD")).toBe("/admin/dashboard");
    expect(ctaHref("REQUESTER", "DONATE")).toBe("/requester/dashboard");
    expect(ctaHref("ORGANIZATION", "JOIN_ORG")).toBe("/organization/dashboard");
    expect(ctaHref("DONOR", "JOIN_ORG")).toBe("/donor/dashboard");
  });
  it("người đã đăng nhập không bao giờ bị đưa tới /register hay /login", () => {
    for (const role of ["DONOR", "REQUESTER", "ORGANIZATION", "ADMIN"] as const)
      for (const intent of ["NEED_BLOOD", "DONATE", "JOIN_ORG"] as const)
        expect(ctaHref(role, intent)).not.toMatch(/\/(register|login)/);
  });
});

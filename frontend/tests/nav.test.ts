import { describe, expect, it } from "vitest";

import { NAV, ROLE_META } from "@/components/shell/nav";
import type { Role } from "@/types/domain";

const ROLES: Role[] = ["DONOR", "REQUESTER", "ORGANIZATION", "ADMIN"];

describe("điều hướng theo vai trò", () => {
  it("mỗi vai trò có nhận diện riêng (nhãn không trùng nhau)", () => {
    const titles = ROLES.map((r) => ROLE_META[r].title);
    expect(new Set(titles).size).toBe(ROLES.length);
    for (const r of ROLES) expect(ROLE_META[r].hint.length).toBeGreaterThan(5);
  });

  it("mục đầu tiên là Tổng quan (dashboard); không gọi dashboard là 'Trang chủ' để khỏi nhầm với trang chủ công khai", () => {
    for (const r of ROLES) {
      expect(NAV[r][0].href).toBe(`/${r.toLowerCase()}/dashboard`);
      expect(NAV[r][0].label).toBe("Tổng quan");
      expect(NAV[r].some((i) => i.label === "Trang chủ")).toBe(false);
    }
  });

  it("mỗi vai trò có tối đa 5 mục trên thanh điều hướng dưới (mobile)", () => {
    for (const r of ROLES) {
      const n = NAV[r].filter((i) => i.mobile).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it("chỉ chuyển người dùng tới đường dẫn thuộc vai trò của họ hoặc bản đồ chung", () => {
    for (const r of ROLES) {
      for (const item of NAV[r]) {
        expect(item.href.startsWith(`/${r.toLowerCase()}/`) || item.href === "/map").toBe(true);
      }
    }
  });
});

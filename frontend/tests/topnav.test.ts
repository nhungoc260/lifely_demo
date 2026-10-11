import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { initialsOf, isActive, NAV, TOPNAV, TOPNAV_ROLES, type NavItem } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";

describe("giao diện công khai cho người hiến máu và người cần máu", () => {
  it("chỉ người hiến máu và người cần máu dùng thanh menu ngang; tổ chức và admin dùng thanh bên", () => {
    expect([...TOPNAV_ROLES].sort()).toEqual(["DONOR", "REQUESTER"]);
    expect(Object.keys(TOPNAV).sort()).toEqual(["DONOR", "REQUESTER"]);
  });

  it("mọi liên kết thuộc đúng vai trò hoặc là bản đồ chung", () => {
    for (const role of TOPNAV_ROLES) {
      const cfg = TOPNAV[role]!;
      const prefix = `/${role.toLowerCase()}/`;
      const all = [...cfg.links, ...cfg.menu, { href: cfg.bell } as NavItem, ...(cfg.cta ? [{ href: cfg.cta.href } as NavItem] : [])];
      for (const l of all) expect(l.href.startsWith(prefix) || l.href === "/map", `${role}: ${l.href}`).toBe(true);
    }
  });

  it("thanh menu có Tổng quan đầu tiên, và chuông trỏ tới trang thông báo của chính vai trò đó", () => {
    for (const role of TOPNAV_ROLES) {
      expect(TOPNAV[role]!.links[0].href).toBe(NAV[role][0].href);
      expect(TOPNAV[role]!.bell).toBe(`/${role.toLowerCase()}/notifications`);
    }
  });

  it("mục đầu tiên trên thanh menu là Trang chủ của vai trò và không có hai mục cùng ý nghĩa", () => {
    for (const role of TOPNAV_ROLES) {
      const labels = TOPNAV[role]!.links.map((l) => l.label);
      expect(labels[0]).toBe("Trang chủ");
      expect(labels).not.toContain("Tổng quan");
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("chỉ người cần máu có nút tạo yêu cầu nổi bật", () => {
    expect(TOPNAV.REQUESTER!.cta?.href).toBe("/requester/requests/create");
    expect(TOPNAV.DONOR!.cta).toBeUndefined();
  });

  it("mục cha không sáng khi đang ở mục con có đường dẫn khớp hơn", () => {
    const items = NAV.REQUESTER;
    const list = items.find((i) => i.href === "/requester/requests")!;
    const create = items.find((i) => i.href === "/requester/requests/create")!;
    expect(isActive("/requester/requests/create", create, items)).toBe(true);
    expect(isActive("/requester/requests/create", list, items)).toBe(false);
    expect(isActive("/requester/requests/abc", list, items)).toBe(true);
  });

  it("lấy chữ cái đầu của hai từ cuối trong họ tên làm avatar", () => {
    expect(initialsOf("Lê Hoàng Nam")).toBe("HN");
    expect(initialsOf("Phạm Thu Hà")).toBe("TH");
    expect(initialsOf("  ")).toBe("?");
  });

  it("menu tài khoản có nhãn truy cập, nút về trang chủ và đăng xuất", () => {
    const html = renderToStaticMarkup(
      createElement(UserMenu, { fullName: "Lê Hoàng Nam", email: "donor@lifely.demo", roleLabel: "Người hiến máu", items: TOPNAV.DONOR!.menu, onSignOut: () => {} }),
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Trang giới thiệu LIFELY");
    expect(html).toContain("Người hiến máu");
    expect(html).toContain("Đăng xuất");
    expect(html).toContain("Hồ sơ của tôi");
    expect(html).toContain('href="/"');
  });
});

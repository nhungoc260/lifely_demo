import { describe, expect, it } from "vitest";

import { telHref } from "@/lib/phone";

describe("telHref", () => {
  it("tạo liên kết tel: từ số hợp lệ", () => {
    expect(telHref("0901234567")).toBe("tel:0901234567");
    expect(telHref("090 123 4567")).toBe("tel:0901234567");
    expect(telHref("+84 901-234-567")).toBe("tel:+84901234567");
    expect(telHref("(028) 3822 1234")).toBe("tel:02838221234");
  });
  it("trả null khi thiếu số", () => {
    expect(telHref(null)).toBeNull();
    expect(telHref(undefined)).toBeNull();
    expect(telHref("   ")).toBeNull();
  });
  it("từ chối số không hợp lệ hoặc có ký tự lạ (chống chèn giao thức/lệnh)", () => {
    expect(telHref("12345")).toBeNull();
    expect(telHref("1234567890123456")).toBeNull();
    expect(telHref("0901234567;rm")).toBeNull();
    expect(telHref("javascript:alert(1)")).toBeNull();
    expect(telHref("abc")).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf-8");

describe("giao diện sáng/tối cho thành phần gốc của trình duyệt", () => {
  it("khai báo color-scheme cho cả hai chế độ", () => {
    expect(css).toMatch(/:root\s*\{\s*color-scheme:\s*light;\s*\}/);
    expect(css).toMatch(/\.dark\s*\{\s*color-scheme:\s*dark;\s*\}/);
  });
  it("danh sách thả xuống dùng màu nền/chữ theo giao diện (tránh chữ trắng nền trắng)", () => {
    expect(css).toMatch(/select option,\s*select optgroup\s*\{[^}]*background-color:\s*var\(--card\);[^}]*color:\s*var\(--foreground\);/);
  });
});

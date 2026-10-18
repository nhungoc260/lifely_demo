import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Thực thể HTML (&ldquo; &amp; ...) đặt trong chuỗi JavaScript sẽ hiện nguyên văn trên màn hình. Kiểm các trang admin. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("trang admin", () => {
  it("không có thực thể HTML nằm trong chuỗi JavaScript (sẽ hiện nguyên chữ)", () => {
    const bad: string[] = [];
    for (const f of files(join(process.cwd(), "app/admin"))) {
      readFileSync(f, "utf-8").split("\n").forEach((line, i) => {
        if (/(["'`])[^"'`\n]*&(ldquo|rdquo|amp|nbsp|lt|gt|quot);[^"'`\n]*\1/.test(line) && !/>[^<{]*&(ldquo|rdquo|amp|nbsp|lt|gt|quot);/.test(line.replace(/\{[^}]*\}/g, ""))) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});

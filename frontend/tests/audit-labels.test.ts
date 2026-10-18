import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { AUDIT_LABEL } from "@/lib/labels";

const javaPath = join(process.cwd(), "../backend/src/main/java/com/lifely/audit/AuditAction.java");

describe("nhật ký hoạt động của admin", () => {
  // Chỉ chạy khi có mã nguồn backend cạnh frontend (trong repo đầy đủ).
  it.skipIf(!existsSync(javaPath))("mọi mã hành động ở backend đều có nhãn tiếng Việt (admin không thấy mã thô)", () => {
    const codes = [...readFileSync(javaPath, "utf-8").matchAll(/String\s+\w+\s*=\s*"(\w+)"/g)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(10);
    expect(codes.filter((c) => !AUDIT_LABEL[c])).toEqual([]);
  });
});

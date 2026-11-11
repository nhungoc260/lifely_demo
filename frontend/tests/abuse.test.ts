import { describe, expect, it } from "vitest";

import { ABUSE_RULE_CODES, AUTO_ACTION_LABEL, RULE_LABEL, ruleLabel, SEVERITY_LABEL, SUBJECT_LABEL } from "@/lib/abuse";

describe("nhãn giám sát bất thường", () => {
  it("mọi mã quy tắc đều có tiêu đề và giải thích để admin hiểu ngay", () => {
    for (const code of ABUSE_RULE_CODES) {
      expect(RULE_LABEL[code].title.length).toBeGreaterThan(5);
      expect(RULE_LABEL[code].why.length).toBeGreaterThan(10);
    }
  });
  it("12 mã quy tắc, không trùng", () => {
    expect(ABUSE_RULE_CODES).toHaveLength(12);
    expect(new Set(ABUSE_RULE_CODES).size).toBe(12);
  });
  it("mã lạ (backend thêm quy tắc mới) vẫn hiện được, không vỡ giao diện", () => {
    expect(ruleLabel("RULE_MOI").title).toBe("RULE_MOI");
  });
  it("đủ nhãn cho mức độ, hành động tự động và loại đối tượng", () => {
    expect(Object.keys(SEVERITY_LABEL).sort()).toEqual(["HIGH", "MEDIUM"]);
    expect(Object.keys(AUTO_ACTION_LABEL).sort()).toEqual(["AUTO_CANCELLED", "NONE", "SUPPORT_BLOCKED"]);
    expect(Object.keys(SUBJECT_LABEL).sort()).toEqual(["APPOINTMENT", "ORGANIZATION", "REQUEST"]);
  });
});

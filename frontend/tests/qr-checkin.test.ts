import { describe, expect, it } from "vitest";

import { apptPayload, parseApptCode } from "@/components/appointments/qr-code";

const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("mã QR check-in lịch hẹn", () => {
  it("mã tạo ra có thể đọc lại đúng mã lịch hẹn", () => {
    expect(parseApptCode(apptPayload(ID))).toBe(ID);
  });
  it("chấp nhận mã dán thô hoặc có khoảng trắng", () => {
    expect(parseApptCode(`  ${ID}\n`)).toBe(ID);
  });
  it("từ chối nội dung không chứa mã lịch hẹn", () => {
    expect(parseApptCode("xin chao")).toBeNull();
    expect(parseApptCode("")).toBeNull();
  });
});

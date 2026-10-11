import { describe, expect, it } from "vitest";

import { isClosed, requestProgressText, splitRequests } from "@/lib/request-progress";
import type { RequestStatus } from "@/types/domain";

const ALL: RequestStatus[] = ["CREATED", "PENDING_VERIFICATION", "VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED", "EXPIRED"];

describe("tiến độ yêu cầu bằng lời thường", () => {
  it("mọi trạng thái đều có câu mô tả không rỗng", () => {
    for (const s of ALL) expect(requestProgressText(s, 0, 2).length, s).toBeGreaterThan(10);
  });

  it("nói rõ yêu cầu đang chờ quản trị viên xác minh", () => {
    expect(requestProgressText("PENDING_VERIFICATION", 0, 2)).toContain("quản trị viên xác minh");
  });

  it("đã liên hệ nhưng chưa ai nhận lời: không bịa số liệu", () => {
    const t = requestProgressText("DONORS_CONTACTED", 0, 2);
    expect(t).toContain("Chưa có ai nhận lời");
    expect(t).not.toMatch(/\d\/\d/);
  });

  it("có người nhận lời thì hiện đúng số", () => {
    expect(requestProgressText("DONORS_CONTACTED", 1, 2)).toContain("1/2 người hiến đã nhận lời");
    expect(requestProgressText("PARTIALLY_FULFILLED", 3, 5)).toContain("3/5");
  });

  it("phân loại đang mở và đã đóng", () => {
    expect(["FULFILLED", "CANCELLED", "EXPIRED"].every((s) => isClosed(s as RequestStatus))).toBe(true);
    expect(["CREATED", "PENDING_VERIFICATION", "MATCHING", "DONORS_CONTACTED"].some((s) => isClosed(s as RequestStatus))).toBe(false);
    const { open, closed } = splitRequests(ALL.map((status) => ({ status })));
    expect(open).toHaveLength(6);
    expect(closed).toHaveLength(3);
  });
});

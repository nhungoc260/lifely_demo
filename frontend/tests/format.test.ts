import { describe, expect, it } from "vitest";

import { formatCountdown, timeAgo } from "@/lib/format";

describe("formatCountdown", () => {
  it("formats the spec example 01:42:18", () => {
    expect(formatCountdown((1 * 3600 + 42 * 60 + 18) * 1000)).toBe("01:42:18");
  });
  it("never goes negative", () => {
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
  it("pads every part", () => {
    expect(formatCountdown(61_000)).toBe("00:01:01");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2027-01-01T12:00:00Z");
  it("handles recent, minutes, hours, days", () => {
    expect(timeAgo("2027-01-01T11:59:50Z", now)).toBe("vừa xong");
    expect(timeAgo("2027-01-01T11:30:00Z", now)).toBe("30 phút trước");
    expect(timeAgo("2027-01-01T09:00:00Z", now)).toBe("3 giờ trước");
    expect(timeAgo("2026-12-30T12:00:00Z", now)).toBe("2 ngày trước");
  });
});

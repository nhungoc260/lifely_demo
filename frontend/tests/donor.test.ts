import { describe, expect, it } from "vitest";

import { milestoneProgress, readiness } from "@/lib/donor";

describe("readiness (coordination schedule, not medical advice)", () => {
  it("is ready when the donor never donated", () => {
    expect(readiness(null, "2027-03-01")).toEqual({ ready: true, nextDate: null, daysLeft: 0 });
  });
  it("rests for 84 days after a donation", () => {
    const r = readiness("2027-01-01", "2027-01-11");
    expect(r.ready).toBe(false);
    expect(r.nextDate).toBe("2027-03-26");
    expect(r.daysLeft).toBe(74);
  });
  it("becomes ready exactly on day 84", () => {
    expect(readiness("2027-01-01", "2027-03-26").ready).toBe(true);
    expect(readiness("2027-01-01", "2027-03-25").ready).toBe(false);
  });
});

describe("milestones", () => {
  it("starts with no badge and points to the first one", () => {
    const p = milestoneProgress(0);
    expect(p.earned).toHaveLength(0);
    expect(p.next?.threshold).toBe(1);
  });
  it("awards by threshold and finds the next goal", () => {
    const p = milestoneProgress(5);
    expect(p.earned.map((m) => m.id)).toEqual(["first", "three", "five"]);
    expect(p.next?.id).toBe("ten");
  });
  it("has no next goal after the last milestone", () => {
    expect(milestoneProgress(12).next).toBeNull();
  });
});

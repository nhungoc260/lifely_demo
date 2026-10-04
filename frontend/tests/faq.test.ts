import { describe, expect, it } from "vitest";

import { FAQS, searchFaq } from "@/components/support/faq-data";

describe("rule-based FAQ search", () => {
  it("finds answers with or without Vietnamese diacritics", () => {
    expect(searchFaq("quên mật khẩu")[0].q).toContain("mật khẩu");
    expect(searchFaq("quen mat khau")[0].q).toContain("mật khẩu");
  });
  it("routes an urgent need to the emergency answer first", () => {
    expect(searchFaq("cần máu gấp")[0].q).toContain("cần máu gấp");
  });
  it("returns nothing for gibberish so the UI can offer the staff hotline", () => {
    expect(searchFaq("xyz qwerty")).toEqual([]);
    expect(searchFaq("a")).toEqual([]);
  });
  it("every answer is non-empty and the emergency answer mentions 115", () => {
    FAQS.forEach((f) => expect(f.a.length).toBeGreaterThan(20));
    expect(FAQS[0].a).toContain("115");
  });
  it("never claims to decide medical eligibility", () => {
    const f = FAQS.find((x) => x.q.includes("đủ điều kiện"))!;
    expect(f.a).toContain("Không");
  });
});

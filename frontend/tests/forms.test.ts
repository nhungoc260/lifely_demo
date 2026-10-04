import { describe, expect, it } from "vitest";

import { qs } from "@/lib/api";
import { safeNext } from "@/lib/forms";

describe("safeNext (open-redirect protection)", () => {
  it("allows internal paths", () => {
    expect(safeNext("/donor/dashboard")).toBe("/donor/dashboard");
  });
  it("rejects external and protocol-relative URLs", () => {
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("javascript:alert(1)")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe("qs", () => {
  it("skips empty values and encodes the rest", () => {
    expect(qs({ a: 1, b: "", c: undefined, d: null, e: "O+" })).toBe("?a=1&e=O%2B");
  });
  it("returns an empty string when nothing is set", () => {
    expect(qs({})).toBe("");
  });
});

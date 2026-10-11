import { describe, expect, it } from "vitest";

import { jwtExpiresAt, msUntilExpiry } from "@/lib/jwt";

function makeJwt(payload: object): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.signature`;
}

describe("jwt helpers", () => {
  it("reads exp in milliseconds", () => {
    expect(jwtExpiresAt(makeJwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });
  it("computes time left relative to now", () => {
    const t = makeJwt({ exp: 1000 });
    expect(msUntilExpiry(t, 400_000)).toBe(600_000);
    expect(msUntilExpiry(t, 1_500_000)).toBe(-500_000);
  });
  it("returns null for malformed tokens instead of throwing", () => {
    expect(jwtExpiresAt("not-a-jwt")).toBeNull();
    expect(jwtExpiresAt("a.%%%.c")).toBeNull();
    expect(jwtExpiresAt(makeJwt({ sub: "x" }))).toBeNull();
    expect(msUntilExpiry("garbage")).toBeNull();
  });
});

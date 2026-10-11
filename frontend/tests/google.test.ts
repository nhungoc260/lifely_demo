import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearPendingGoogle, parsePendingGoogle, readPendingGoogleRaw, savePendingGoogle } from "@/lib/google";

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  return store;
}

describe("thông tin Google đang chờ hoàn tất hồ sơ", () => {
  beforeEach(() => void stubSessionStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("lưu rồi đọc lại đúng nội dung", () => {
    savePendingGoogle({ credential: "abc.def.ghi", email: "a@gmail.com", fullName: "Như Ngọc", role: "DONOR" });
    expect(parsePendingGoogle(readPendingGoogleRaw())).toEqual({ credential: "abc.def.ghi", email: "a@gmail.com", fullName: "Như Ngọc", role: "DONOR" });
  });

  it("xóa xong thì không còn gì", () => {
    savePendingGoogle({ credential: "abc", email: "a@gmail.com", fullName: "A" });
    clearPendingGoogle();
    expect(readPendingGoogleRaw()).toBeNull();
    expect(parsePendingGoogle(readPendingGoogleRaw())).toBeNull();
  });

  it("bỏ qua dữ liệu hỏng hoặc thiếu credential", () => {
    expect(parsePendingGoogle(null)).toBeNull();
    expect(parsePendingGoogle("không phải json")).toBeNull();
    expect(parsePendingGoogle(JSON.stringify({ email: "a@gmail.com" }))).toBeNull();
    expect(parsePendingGoogle(JSON.stringify({ credential: "" }))).toBeNull();
  });

  it("giá trị sai kiểu được thay bằng chuỗi rỗng", () => {
    expect(parsePendingGoogle(JSON.stringify({ credential: "abc", email: 5, fullName: null }))).toEqual({ credential: "abc", email: "", fullName: "", role: undefined });
  });
});

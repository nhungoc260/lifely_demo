import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InstallButton } from "@/components/pwa/install-button";
import { isIosDevice, isStandaloneDisplay } from "@/lib/pwa";

describe("isIosDevice", () => {
  it("nhận iPhone, iPad, iPod", () => {
    expect(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "iPhone", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)", "iPad", 5)).toBe(true);
  });
  it("nhận iPadOS giả danh Mac (có cảm ứng) nhưng không nhận Mac thật", () => {
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0)).toBe(false);
  });
  it("không nhận Windows/Android", () => {
    expect(isIosDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0)).toBe(false);
    expect(isIosDevice("Mozilla/5.0 (Linux; Android 14)", "Linux armv8l", 5)).toBe(false);
  });
});

describe("isStandaloneDisplay", () => {
  it("true khi display-mode standalone hoặc navigator.standalone", () => {
    expect(isStandaloneDisplay(true, undefined)).toBe(true);
    expect(isStandaloneDisplay(false, true)).toBe(true);
    expect(isStandaloneDisplay(false, false)).toBe(false);
    expect(isStandaloneDisplay(false, undefined)).toBe(false);
  });
});

describe("InstallButton", () => {
  it("không hiển thị gì khi render phía máy chủ (tránh lệch giao diện và nút giả)", () => {
    expect(renderToStaticMarkup(createElement(InstallButton))).toBe("");
  });
});

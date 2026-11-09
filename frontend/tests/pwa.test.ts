import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InstallButton } from "@/components/pwa/install-button";
import { isAndroidDevice, isInAppBrowser, isIosDevice, isIosSafari, isStandaloneDisplay } from "@/lib/pwa";

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

describe("nhận diện trình duyệt để hướng dẫn cài", () => {
  const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const chromeIos = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";
  const zalo = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo/23.1";
  it("isIosSafari chỉ đúng với Safari thật", () => {
    expect(isIosSafari(safari)).toBe(true);
    expect(isIosSafari(chromeIos)).toBe(false);
    expect(isIosSafari(zalo)).toBe(false);
  });
  it("isInAppBrowser nhận Zalo/Facebook", () => {
    expect(isInAppBrowser(zalo)).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 (Linux; Android 14) [FBAN/FB4A;FBAV/400]")).toBe(true);
    expect(isInAppBrowser(safari)).toBe(false);
  });
  it("isAndroidDevice", () => {
    expect(isAndroidDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(true);
    expect(isAndroidDevice(safari)).toBe(false);
  });
});

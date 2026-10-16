import { describe, expect, it } from "vitest";

import { chartDomain, describeSeries, scaleX, scaleY, statusText, toPoints } from "@/lib/health";
import { isIosDevice, pushSupport, urlBase64ToUint8Array } from "@/lib/push";
import type { HealthCheck } from "@/types/domain";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
const base = { hasServiceWorker: true, hasPushManager: true, hasNotification: true, standalone: false, permission: "default" as const };

describe("Web Push phía trình duyệt", () => {
  it("giải mã khóa VAPID base64url thành đúng 65 byte bắt đầu bằng 0x04", () => {
    const key = "BOgt4Pb507W8mdgXbkkm4W1RoMNE6Ck540SbgcgcU0g525lzO6rMSOvMMLlLjPNvWzyiN4YJUANX3Gts4f37mcU";
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });

  it("iPhone chưa cài vào màn hình chính thì phải hướng dẫn cài trước", () => {
    expect(isIosDevice(IPHONE)).toBe(true);
    expect(isIosDevice(ANDROID)).toBe(false);
    expect(pushSupport({ ...base, userAgent: IPHONE })).toEqual({ ok: false, reason: "ios-needs-install" });
    expect(pushSupport({ ...base, userAgent: IPHONE, standalone: true })).toEqual({ ok: true });
  });

  it("Android Chrome dùng được; thiếu API hoặc bị chặn thì báo đúng lý do", () => {
    expect(pushSupport({ ...base, userAgent: ANDROID })).toEqual({ ok: true });
    expect(pushSupport({ ...base, userAgent: ANDROID, hasPushManager: false })).toEqual({ ok: false, reason: "unsupported" });
    expect(pushSupport({ ...base, userAgent: ANDROID, permission: "denied" })).toEqual({ ok: false, reason: "denied" });
  });
});

describe("biểu đồ sức khỏe", () => {
  const mk = (hr: number | null, out: boolean, at: string): HealthCheck => ({
    id: at, measuredAt: at, heartRate: hr, systolic: null, diastolic: null, weightKg: null, source: "SELF_ENTERED", anyOutside: out,
    findings: [{ metric: "HEART_RATE", label: "Nhịp tim", value: hr, unit: "lần/phút", status: hr === null ? "NOT_MEASURED" : out ? "OUTSIDE" : "WITHIN", rangeText: "60–90", note: "", provisional: false }],
  });

  it("miền trục Y bao cả dữ liệu lẫn dải ngưỡng", () => {
    const d = chartDomain([55, 72, 95], [{ min: 60, max: 90 }]);
    expect(d.min).toBeLessThanOrEqual(55);
    expect(d.max).toBeGreaterThanOrEqual(95);
    expect(chartDomain([], [])).toEqual({ min: 0, max: 1 });
  });

  it("scaleY đảo trục (giá trị lớn ở phía trên) và scaleX chia đều", () => {
    const dom = { min: 0, max: 100 };
    expect(scaleY(0, dom, 100)).toBe(100);
    expect(scaleY(100, dom, 100)).toBe(0);
    expect(scaleY(50, dom, 100)).toBe(50);
    expect(scaleX(0, 3, 200)).toBe(0);
    expect(scaleX(1, 3, 200)).toBe(100);
    expect(scaleX(2, 3, 200)).toBe(200);
    expect(scaleX(0, 1, 200)).toBe(100);
  });

  it("đánh dấu điểm ngoài ngưỡng và mô tả cho trình đọc màn hình không chẩn đoán", () => {
    const pts = toPoints([mk(72, false, "2026-10-01"), mk(95, true, "2026-10-08"), mk(null, false, "2026-10-09")], (c) => c.heartRate, "HEART_RATE", (s) => s.slice(5));
    expect(pts.map((p) => p.outside)).toEqual([false, true, false]);
    const text = describeSeries("Nhịp tim", "lần/phút", pts);
    expect(text).toContain("2 lần đo");
    expect(text).toContain("1 lần ngoài ngưỡng");
    expect(text.toLowerCase()).not.toMatch(/bệnh|chẩn đoán|nguy hiểm/);
    expect(describeSeries("Nhịp tim", "lần/phút", [])).toContain("chưa có số liệu");
  });

  it("trạng thái hiến lại: 'Có thể hiến' hoặc 'Còn X ngày nữa'", () => {
    const f = (iso: string) => iso.slice(0, 10);
    expect(statusText(true, 0, null, f)).toBe("Có thể hiến");
    expect(statusText(false, 12, "2026-11-02T00:00:00Z", f)).toBe("Còn 12 ngày nữa mới hiến lại được (từ 2026-11-02)");
  });
});

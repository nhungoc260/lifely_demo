import jsQR from "jsqr";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";

import { apptPayload, parseApptCode } from "@/components/appointments/qr-code";

/** Dựng ảnh RGBA từ ma trận QR (có viền trắng) để thử giải mã như khi quét bằng camera trên máy tính. */
function render(text: string, scale = 6, quiet = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const size = (n + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!qr.modules.get(x, y)) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = (((y + quiet) * scale + dy) * size + (x + quiet) * scale + dx) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return { data, size };
}

describe("quét mã QR bằng jsQR (máy tính, không có BarcodeDetector)", () => {
  it("giải mã lại đúng mã lịch hẹn", () => {
    const id = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
    const { data, size } = render(apptPayload(id));
    const result = jsQR(data, size, size);
    expect(result?.data).toBe(apptPayload(id));
    expect(parseApptCode(result?.data ?? "")).toBe(id);
  });
});

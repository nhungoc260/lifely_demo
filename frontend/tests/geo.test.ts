import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/geocode/route";
import { describeGeoError } from "@/lib/geo";
import { fromNominatim, fromPhoton, inVietnam } from "@/lib/geocode";

describe("describeGeoError", () => {
  it("nói rõ lý do và cách khắc phục theo từng mã lỗi", () => {
    expect(describeGeoError(1)).toMatch(/chặn quyền vị trí/);
    expect(describeGeoError(2)).toMatch(/Dịch vụ định vị/);
    expect(describeGeoError(3)).toMatch(/quá lâu/);
    expect(describeGeoError(undefined)).toMatch(/Không lấy được vị trí/);
  });
  it("báo cần HTTPS khi không phải ngữ cảnh an toàn", () => {
    expect(describeGeoError(1, false)).toMatch(/HTTPS/);
  });
});

describe("chuẩn hóa kết quả tìm địa điểm", () => {
  it("Nominatim: lấy toạ độ, bỏ kết quả ngoài Việt Nam hoặc sai dữ liệu", () => {
    const out = fromNominatim([
      { lat: "10.7769", lon: "106.7009", display_name: "Quận 1, TP.HCM" },
      { lat: "48.85", lon: "2.35", display_name: "Paris" },
      { lat: "abc", lon: "106", display_name: "Lỗi" },
    ]);
    expect(out).toEqual([{ lat: 10.7769, lng: 106.7009, label: "Quận 1, TP.HCM" }]);
    expect(fromNominatim({})).toEqual([]);
  });
  it("Photon: đảo đúng thứ tự [kinh độ, vĩ độ] và ghép nhãn", () => {
    const out = fromPhoton({ features: [{ geometry: { coordinates: [106.7009, 10.7769] }, properties: { name: "Quận 1", city: "TP.HCM" } }] });
    expect(out).toEqual([{ lat: 10.7769, lng: 106.7009, label: "Quận 1, TP.HCM" }]);
    expect(fromPhoton(null)).toEqual([]);
  });
  it("inVietnam", () => {
    expect(inVietnam(10.77, 106.7)).toBe(true);
    expect(inVietnam(35, 139)).toBe(false);
  });
});

describe("GET /geocode", () => {
  afterEach(() => vi.restoreAllMocks());
  const call = (q: string) => GET(new Request(`http://x/geocode?q=${encodeURIComponent(q)}`));
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it("từ khóa quá ngắn: 400", async () => {
    expect((await call("a")).status).toBe(400);
  });
  it("Nominatim có kết quả: dùng luôn, không gọi dự phòng", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok([{ lat: "10.77", lon: "106.7", display_name: "Q1" }]));
    const res = await call("Quận 1");
    expect((await res.json()).results).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).toContain("nominatim");
  });
  it("Nominatim bị từ chối (403/429): chuyển sang Photon", async () => {
    const f = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("blocked", { status: 429 }))
      .mockResolvedValueOnce(ok({ features: [{ geometry: { coordinates: [106.7, 10.77] }, properties: { name: "Q1" } }] }));
    const res = await call("Quận 1");
    expect(res.status).toBe(200);
    expect((await res.json()).results[0].lat).toBe(10.77);
    expect(String(f.mock.calls[1][0])).toContain("photon");
  });
  it("cả hai dịch vụ đều hỏng: 502 kèm thông báo rõ", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const res = await call("Quận 1");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/không phản hồi/);
  });
  it("tìm được dịch vụ nhưng không có kết quả: 200 với danh sách rỗng (không phải lỗi)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok([]));
    const res = await call("zzzzzz");
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import {
  beBikeFare, beCarFare, directionsUrl, estimateTravel, fuelCost, grabBikeFare, grabCarFare, greenBikeFare, greenCarFare,
  distanceKm, referenceRows, roadKmFrom, suggestSupport, speedKmh, TRAVEL_COST,
} from "@/lib/travel-cost";

// 10:00 giờ TP.HCM, thứ Ba: không cao điểm
const TUE_10H = new Date("2026-11-10T03:00:00Z");

describe("cước Grab TP.HCM", () => {
  it("2 km đầu tính giá tối thiểu cộng phí nền tảng", () => {
    expect(grabBikeFare(2)).toBe(13_000); // 12.273 + 1.000
    expect(grabCarFare(2)).toBe(31_000); // 28.473 + 3.000
  });
  it("km tiếp theo tính theo đơn giá mỗi km", () => {
    // 4 km (phí nền tảng 2.000): 12.273 + 2 x 4.222 + 2.000 = 22.717 -> 23.000
    expect(grabBikeFare(4)).toBe(23_000);
    // 6,75 km (> 6 km, phí nền tảng 3.000): 12.273 + 4,75 x 4.222 + 3.000 = 35.329 -> 35.000
    expect(grabBikeFare(6.75)).toBe(35_000);
    // 10 km: 12.273 + 8 x 4.222 + 3.000 = 49.049 -> 49.000
    expect(grabBikeFare(10)).toBe(49_000);
  });
  it("GrabCar luôn đắt hơn GrabBike cùng quãng đường", () => {
    for (const km of [1, 3, 8, 20]) expect(grabCarFare(km)).toBeGreaterThan(grabBikeFare(km));
  });
});

describe("cước Be và Xanh SM TP.HCM", () => {
  it("2 km đầu đúng giá mở cửa đã công bố", () => {
    expect(beBikeFare(2)).toBe(14_000); // 13.817
    expect(beCarFare(2)).toBe(32_000); // 31.501
    expect(greenBikeFare(2)).toBe(13_000); // 12.500 -> làm tròn
    expect(greenCarFare(2)).toBe(31_000); // 30.500 -> làm tròn
  });
  it("beBike 6 km: 13.817 + 4 x 4.633 = 32.349 -> 32.000", () => {
    expect(beBikeFare(6)).toBe(32_000);
  });
  it("Xanh SM Car tính theo bậc: 12 km = 30.500 + 10 x 15.200 = 182.500; 20 km thêm 8 x 14.700", () => {
    expect(greenCarFare(12)).toBe(Math.round(182_500 / 1000) * 1000);
    expect(greenCarFare(20)).toBe(Math.round((182_500 + 8 * 14_700) / 1000) * 1000);
  });
  it("ô tô luôn đắt hơn xe máy cùng hãng", () => {
    for (const km of [1, 5, 15]) {
      expect(beCarFare(km)).toBeGreaterThan(beBikeFare(km));
      expect(greenCarFare(km)).toBeGreaterThan(greenBikeFare(km));
    }
  });
});

describe("tiền xăng xe máy", () => {
  it("tăng tỉ lệ theo quãng đường và theo mức tiêu hao", () => {
    expect(fuelCost(20, 1.82)).toBeGreaterThan(fuelCost(10, 1.82));
    expect(fuelCost(10, 2.23)).toBeGreaterThan(fuelCost(10, 1.82));
  });
  it("10 km đường thực tế, 2,23 L/100km, giá 21.150đ: khoảng 6.000đ", () => {
    const expected = (10 / 100) * 2.23 * TRAVEL_COST.cityFuelFactor * TRAVEL_COST.fuelPricePerLiter;
    expect(fuelCost(10, 2.23)).toBe(Math.round(expected / 1000) * 1000);
  });
});

describe("estimateTravel", () => {
  it("đường thực tế = chim bay x hệ số 1,35", () => {
    expect(roadKmFrom(10)).toBeCloseTo(13.5, 5);
  });
  it("đi và về gấp đôi Grab; gửi xe máy chỉ tính một lần", () => {
    const one = estimateTravel({ straightKm: 5, roundTrip: false, departure: TUE_10H });
    const two = estimateTravel({ straightKm: 5, roundTrip: true, departure: TUE_10H });
    expect(one.options.map((o) => o.mode)).toEqual(["motorbike", "grabBike", "beBike", "greenBike", "grabCar", "beCar", "greenCar"]);
    const g1 = one.options.find((o) => o.mode === "grabBike")!;
    const g2 = two.options.find((o) => o.mode === "grabBike")!;
    expect(g2.total).toBe(g1.total * 2);
    const m1 = one.options.find((o) => o.mode === "motorbike")!;
    const m2 = two.options.find((o) => o.mode === "motorbike")!;
    expect(m2.total).toBeLessThan(m1.total * 2);
  });
  it("xe máy cá nhân rẻ nhất ở các quãng đường thông thường", () => {
    for (const km of [1, 3, 5, 10, 25]) expect(estimateTravel({ straightKm: km, departure: TUE_10H }).cheapest).toBe("motorbike");
  });
  it("hỗ trợ đi lại 50.000đ trừ một lần cho cả chuyến, không âm", () => {
    const e = estimateTravel({ straightKm: 3, roundTrip: true, departure: TUE_10H });
    const motor = e.options.find((o) => o.mode === "motorbike")!;
    const car = e.options.find((o) => o.mode === "grabCar")!;
    expect(motor.afterSupport).toBe(0);
    expect(car.afterSupport).toBe(car.total - TRAVEL_COST.facilityTravelSupport);
  });
  it("đánh dấu rẻ nhất trong từng nhóm", () => {
    const e = estimateTravel({ straightKm: 5, departure: TUE_10H });
    for (const g of ["self", "bike", "car"] as const) {
      const rows = e.options.filter((o) => o.group === g);
      const min = Math.min(...rows.map((o) => o.total));
      expect(rows.filter((o) => o.bestInGroup).every((o) => o.total === min)).toBe(true);
      expect(rows.some((o) => o.bestInGroup)).toBe(true);
    }
  });
  it("quãng đường 0 km không ra số âm hay NaN", () => {
    const e = estimateTravel({ straightKm: 0, departure: TUE_10H });
    for (const o of e.options) expect(Number.isFinite(o.total) && o.total >= 0).toBe(true);
  });
});

describe("thời gian di chuyển theo giờ", () => {
  it("cao điểm sáng ngày thường 15 km/h, cuối tuần 25, ban đêm 35", () => {
    expect(speedKmh(new Date("2026-11-10T00:30:00Z"))).toBe(15); // 07:30 thứ Ba
    expect(speedKmh(new Date("2026-11-07T00:30:00Z"))).toBe(25); // 07:30 thứ Bảy
    expect(speedKmh(new Date("2026-11-10T16:00:00Z"))).toBe(35); // 23:00
  });
});

describe("chính sách do cơ sở công bố", () => {
  it("dùng phí gửi xe và mức hỗ trợ của cơ sở thay cho giả định", () => {
    const e = estimateTravel({ straightKm: 3, roundTrip: false, departure: TUE_10H, parkingFee: 0, supportVnd: 30_000 });
    expect(e.parking).toBe(0);
    expect(e.support).toBe(30_000);
    const car = e.options.find((o) => o.mode === "grabCar")!;
    expect(car.afterSupport).toBe(Math.max(0, car.total - 30_000));
    const motor = e.options.find((o) => o.mode === "motorbike")!;
    expect(motor.total).toBe(fuelCost(e.roadKm, 1.82)); // gửi xe miễn phí
  });
  it("cơ sở không hỗ trợ (0đ): người hiến tự chịu toàn bộ", () => {
    const e = estimateTravel({ straightKm: 5, departure: TUE_10H, supportVnd: 0 });
    for (const o of e.options) expect(o.afterSupport).toBe(o.total);
  });
  it("không công bố thì dùng mặc định 50.000đ và 5.000đ", () => {
    const e = estimateTravel({ straightKm: 5, departure: TUE_10H, parkingFee: null, supportVnd: null });
    expect(e.support).toBe(50_000);
    expect(e.parking).toBe(5_000);
  });
});

describe("khoảng cách chim bay", () => {
  it("bằng 0 khi cùng một điểm; Chợ Rẫy tới Bến Thành khoảng 3 km", () => {
    expect(distanceKm(10.76, 106.66, 10.76, 106.66)).toBeCloseTo(0, 5);
    const d = distanceKm(10.7539, 106.6603, 10.7725, 106.698); // Chợ Rẫy -> chợ Bến Thành, xấp xỉ
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(6);
  });
});

describe("bảng tham khảo theo quãng đường", () => {
  it("mỗi dòng khớp hàm tính từng hãng, xe máy rẻ hơn mọi app", () => {
    const rows = referenceRows([3, 10]);
    expect(rows).toHaveLength(2);
    expect(rows[1].grabBike).toBe(grabBikeFare(10));
    expect(rows[1].beCar).toBe(beCarFare(10));
    expect(rows[1].greenCar).toBe(greenCarFare(10));
    for (const r of rows) {
      expect(r.fuel).toBeLessThan(Math.min(r.grabBike, r.beBike, r.greenBike));
      expect(r.grabCar).toBeGreaterThan(r.grabBike);
    }
  });
  it("quãng đường dài hơn thì mọi chi phí đều tăng", () => {
    const [a, b] = referenceRows([5, 15]);
    for (const k of ["fuel", "grabBike", "beBike", "greenBike", "grabCar", "beCar", "greenCar"] as const) expect(b[k]).toBeGreaterThan(a[k]);
  });
});

describe("gợi ý số tiền hỗ trợ theo khoảng cách", () => {
  it("gần thì gợi ý thấp hơn mức công bố, xa thì chạm mức công bố", () => {
    const near = suggestSupport(1, 50_000);
    const far = suggestSupport(12, 50_000);
    expect(near.suggested).toBeLessThan(50_000);
    expect(near.suggested).toBe(Math.round(near.grabBikeRoundTrip / 1000) * 1000);
    expect(far.suggested).toBe(50_000);
  });
  it("không có khoảng cách thì dùng đúng mức công bố; không công bố thì 0", () => {
    expect(suggestSupport(null, 50_000).suggested).toBe(50_000);
    expect(suggestSupport(undefined, 30_000).suggested).toBe(30_000);
    expect(suggestSupport(5, 0).suggested).toBe(0);
  });
  it("luôn trong khoảng 1.000đ tới mức công bố", () => {
    for (const km of [0, 0.2, 1, 3, 8, 30]) {
      const s = suggestSupport(km, 50_000).suggested;
      expect(s).toBeGreaterThanOrEqual(1_000);
      expect(s).toBeLessThanOrEqual(50_000);
    }
  });
});

describe("chỉ đường", () => {
  it("mã hóa tên bệnh viện trong liên kết Google Maps", () => {
    const u = directionsUrl("BV Chợ Rẫy", "Quận 5", "TP.HCM");
    expect(u).toContain("destination=" + encodeURIComponent("BV Chợ Rẫy, Quận 5, TP.HCM"));
    expect(u.startsWith("https://www.google.com/maps/dir/")).toBe(true);
  });
});

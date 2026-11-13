/**
 * Ước tính chi phí đi lại của người hiến tới nơi hiến máu (TP.HCM): xe máy cá nhân, xe máy công nghệ (GrabBike, beBike,
 * Xanh SM Bike), ô tô công nghệ (GrabCar, beCar, Xanh SM Car). Chỉ để người hiến tham khảo, KHÔNG phải giá chốt.
 *
 * Nguồn số liệu (kiểm tra ngày 10/11/2026), mọi hằng số nằm ở TRAVEL_COST để chỉnh một chỗ:
 * - Grab TP.HCM: bảng "Thông tin các dịch vụ trên ứng dụng Grab" (grab.com/vn, cập nhật 08/07/2026), gồm VAT 8%.
 *   GrabBike 12.273đ/2 km đầu, 4.222đ/km tiếp; GrabCar 4 chỗ 28.473đ/2 km đầu, 9.818đ/km tiếp.
 *   Phí nền tảng 10/11/2026-25/02/2027: GrabBike 1.000đ (<= 2 km), 2.000đ (2-6 km), 3.000đ (> 6 km);
 *   GrabCar 3.000đ (<= 3 km), 4.000đ (3-4 km), 5.000-9.000đ (> 4 km, lấy mức thấp nhất).
 * - Be TP.HCM (áp dụng từ 08/05/2026, báo Thanh Niên / VnExpress / Viettimes): beBike 13.817đ/2 km đầu, 4.633đ/km (2-12 km);
 *   beCar 4 chỗ 31.501đ/2 km đầu, 10.779-11.805đ/km tùy quãng đường (lấy giá trị giữa vì chưa rõ mốc chia). Chưa gồm phí nền tảng nếu có.
 * - Xanh SM (nay đổi tên Green SM) TP.HCM: Bike 12.500đ/2 km đầu, 4.800đ/km (mytour.vn, phí ứng dụng đã gồm trong giá);
 *   Car 30.500đ/2 km đầu, 15.200đ/km tới km 12, 14.700đ/km tới km 25, 13.300đ/km từ km 26 (greensm.com, bảng cập nhật 02/2025,
 *   có thể đã đổi). Hai mức giá Xanh SM cũ hơn Grab và Be, cần đối chiếu lại trên app trước khi nộp.
 * - Giá xăng: lấy từ API (admin cập nhật theo công bố Petrolimex, đổi theo ngày). Hằng số dưới đây chỉ là giá DỰ PHÒNG
 *   khi chưa tải được: Petrolimex vùng 1, xăng E10 RON 95 Mức 3, 19.840đ/lít, công bố ngày 12/11/2026.
 * - Tiêu hao do hãng công bố: Honda Vision 1,82 lít/100 km, Air Blade 160 2,23 lít/100 km (điều kiện chuẩn).
 * - Hỗ trợ đi lại cho người hiến máu tình nguyện: tối đa 50.000đ/người/lần hiến, bằng tiền mặt, do cơ sở y tế tiếp nhận máu chi
 *   (văn bản Bộ Y tế, quyền lợi người hiến tại Bệnh viện Truyền máu Huyết học TP.HCM).
 * GIẢ ĐỊNH chưa có nguồn chính thức: hệ số đường thực tế 1,35 (khớp backend), phí gửi xe, hệ số tiêu hao khi kẹt xe.
 *
 * Chưa tính: phụ phí giờ cao điểm, thời tiết xấu, ban đêm, thời gian chờ, cước theo phút của Grab, khuyến mãi.
 */
export const TRAVEL_COST = {
  /** Đường thực tế = đường chim bay x hệ số (cùng giá trị lifely.matching.road-factor ở backend). */
  roadFactor: 1.35,
  fuelPricePerLiter: 19_840,
  fuelPriceNote: "Petrolimex vùng 1, xăng E10 RON 95 Mức 3, công bố ngày 12/11/2026",
  fuelLabel: "Petrolimex vùng 1, xăng E10 RON 95 Mức 3",
  fuelPriceCheckedAt: "12/11/2026",
  /** Hệ số tiêu hao khi chạy phố đông, nhân vào mức hãng công bố. GIẢ ĐỊNH. */
  cityFuelFactor: 1.2,
  /** Phí gửi xe máy mỗi lượt tại cơ sở y tế. GIẢ ĐỊNH, thay bằng số thật của từng bệnh viện khi có. */
  motorbikeParking: 5_000,
  /** Hỗ trợ đi lại tối đa mỗi lần hiến (tiền mặt, cơ sở y tế chi). */
  facilityTravelSupport: 50_000,
  /** Bậc giá: `upTo` là km tích lũy (Infinity = đến hết). Km đầu `baseKm` tính trọn gói `base`. */
  grabBike: { base: 12_273, baseKm: 2, tiers: [{ upTo: Infinity, perKm: 4_222 }] },
  grabCar4: { base: 28_473, baseKm: 2, tiers: [{ upTo: Infinity, perKm: 9_818 }] },
  beBike: { base: 13_817, baseKm: 2, tiers: [{ upTo: Infinity, perKm: 4_633 }] },
  beCar4: { base: 31_501, baseKm: 2, tiers: [{ upTo: Infinity, perKm: 11_292 }] },
  greenBike: { base: 12_500, baseKm: 2, tiers: [{ upTo: Infinity, perKm: 4_800 }] },
  greenCar: { base: 30_500, baseKm: 2, tiers: [{ upTo: 12, perKm: 15_200 }, { upTo: 25, perKm: 14_700 }, { upTo: Infinity, perKm: 13_300 }] },
  /** Tốc độ trung bình (km/h), khớp TravelTimeEstimator ở backend: cao điểm 15, thường 25, ban đêm 35. */
  speed: { peak: 15, normal: 25, night: 35 },
} as const;

export interface VehiclePreset {
  id: "small" | "mid";
  label: string;
  /** Lít/100 km theo hãng công bố. */
  litersPer100Km: number;
}

export const VEHICLE_PRESETS: VehiclePreset[] = [
  { id: "small", label: "Xe tay ga phổ thông (kiểu Vision)", litersPer100Km: 1.82 },
  { id: "mid", label: "Xe tay ga 125-160cc (kiểu Air Blade)", litersPer100Km: 2.23 },
];

export type TravelMode = "motorbike" | "grabBike" | "beBike" | "greenBike" | "grabCar" | "beCar" | "greenCar";
export type TravelGroup = "self" | "bike" | "car";

export interface TravelOption {
  mode: TravelMode;
  group: TravelGroup;
  label: string;
  /** Một chiều, đồng. */
  oneWay: number;
  /** Tổng theo số chiều người dùng chọn (1 hoặc 2), đồng. */
  total: number;
  /** Số tiền người hiến tự chịu sau khi trừ hỗ trợ đi lại tối đa của cơ sở y tế (không âm). */
  afterSupport: number;
  /** Rẻ nhất trong cùng nhóm. */
  bestInGroup: boolean;
  /** Chú thích cách tính ngắn gọn để hiển thị. */
  note: string;
}

export interface TravelEstimate {
  /** Phí gửi xe và mức hỗ trợ thực sự đã dùng để tính (cơ sở công bố hoặc giả định mặc định). */
  parking: number;
  support: number;
  straightKm: number;
  roadKm: number;
  minutes: number;
  legs: 1 | 2;
  options: TravelOption[];
  /** Lựa chọn rẻ nhất. */
  cheapest: TravelMode;
}

export function roadKmFrom(straightKm: number): number {
  return Math.max(0, straightKm) * TRAVEL_COST.roadFactor;
}

/** Làm tròn lên bội số 1.000đ, giống cách Grab hiển thị giá. */
export function roundVnd(v: number): number {
  return Math.round(v / 1000) * 1000;
}

type FareTable = { base: number; baseKm: number; tiers: readonly { upTo: number; perKm: number }[] };

function metered(roadKm: number, t: FareTable): number {
  let fare = t.base;
  let from = t.baseKm;
  for (const tier of t.tiers) {
    if (roadKm <= from) break;
    fare += (Math.min(roadKm, tier.upTo) - from) * tier.perKm;
    from = tier.upTo;
  }
  return fare;
}

export function grabBikePlatformFee(roadKm: number): number {
  if (roadKm <= 2) return 1_000;
  if (roadKm <= 6) return 2_000;
  return 3_000;
}

export function grabCarPlatformFee(roadKm: number): number {
  if (roadKm <= 3) return 3_000;
  if (roadKm <= 4) return 4_000;
  return 5_000;
}

export function grabBikeFare(roadKm: number): number {
  return roundVnd(metered(roadKm, TRAVEL_COST.grabBike) + grabBikePlatformFee(roadKm));
}
export function grabCarFare(roadKm: number): number {
  return roundVnd(metered(roadKm, TRAVEL_COST.grabCar4) + grabCarPlatformFee(roadKm));
}
export function beBikeFare(roadKm: number): number {
  return roundVnd(metered(roadKm, TRAVEL_COST.beBike));
}
export function beCarFare(roadKm: number): number {
  return roundVnd(metered(roadKm, TRAVEL_COST.beCar4));
}
export function greenBikeFare(roadKm: number): number {
  return roundVnd(metered(roadKm, TRAVEL_COST.greenBike));
}
export function greenCarFare(roadKm: number): number {
  return roundVnd(metered(roadKm, TRAVEL_COST.greenCar));
}

/** Tiền xăng cho một chiều. */
export function fuelCost(roadKm: number, litersPer100Km: number, pricePerLiter: number = TRAVEL_COST.fuelPricePerLiter): number {
  const liters = (roadKm / 100) * litersPer100Km * TRAVEL_COST.cityFuelFactor;
  return roundVnd(liters * pricePerLiter);
}

/** Tốc độ theo giờ địa phương Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè). Giờ cao điểm chỉ thứ Hai-thứ Sáu. */
export function speedKmh(departure: Date): number {
  const local = new Date(departure.getTime() + 7 * 3600_000);
  const h = local.getUTCHours() + local.getUTCMinutes() / 60;
  const dow = local.getUTCDay(); // 0 = Chủ nhật
  if (h >= 22 || h < 5) return TRAVEL_COST.speed.night;
  const weekday = dow >= 1 && dow <= 5;
  const peak = (h >= 6.5 && h < 9) || (h >= 16.5 && h < 19.5);
  return weekday && peak ? TRAVEL_COST.speed.peak : TRAVEL_COST.speed.normal;
}

export function travelMinutes(roadKm: number, departure: Date): number {
  return (roadKm / speedKmh(departure)) * 60;
}

export interface EstimateInput {
  straightKm: number;
  /** true = đi và về (mặc định), false = chỉ chiều đi. */
  roundTrip?: boolean;
  litersPer100Km?: number;
  departure?: Date;
  /** Phí gửi xe máy do cơ sở công bố; bỏ trống = dùng giả định mặc định. */
  parkingFee?: number | null;
  /** Mức hỗ trợ đi lại do cơ sở công bố; bỏ trống = mức tối đa theo quy định. */
  supportVnd?: number | null;
  /** Giá xăng hiện hành (đồng/lít); bỏ trống = giá dự phòng trong TRAVEL_COST. */
  fuelPrice?: number | null;
}

export function estimateTravel(input: EstimateInput): TravelEstimate {
  const { straightKm, roundTrip = true, litersPer100Km = VEHICLE_PRESETS[0].litersPer100Km, departure = new Date() } = input;
  const parking = input.parkingFee ?? TRAVEL_COST.motorbikeParking;
  const support = input.supportVnd ?? TRAVEL_COST.facilityTravelSupport;
  const roadKm = roadKmFrom(straightKm);
  const legs: 1 | 2 = roundTrip ? 2 : 1;

  const motorFuelOne = fuelCost(roadKm, litersPer100Km, input.fuelPrice ?? TRAVEL_COST.fuelPricePerLiter);
  const app = "Giá app đã gồm VAT";
  const raw: Omit<TravelOption, "total" | "afterSupport" | "bestInGroup">[] = [
    { mode: "motorbike", group: "self", label: "Xe máy của bạn", oneWay: motorFuelOne + parking, note: "Tiền xăng + gửi xe (gửi một lần)" },
    { mode: "grabBike", group: "bike", label: "GrabBike", oneWay: grabBikeFare(roadKm), note: `${app} + phí nền tảng` },
    { mode: "beBike", group: "bike", label: "beBike", oneWay: beBikeFare(roadKm), note: app },
    { mode: "greenBike", group: "bike", label: "Xanh SM Bike (xe điện)", oneWay: greenBikeFare(roadKm), note: `${app}, bảng giá cũ hơn` },
    { mode: "grabCar", group: "car", label: "GrabCar 4 chỗ", oneWay: grabCarFare(roadKm), note: `${app} + phí nền tảng` },
    { mode: "beCar", group: "car", label: "beCar 4 chỗ", oneWay: beCarFare(roadKm), note: `${app}, đơn giá/km là mức giữa` },
    { mode: "greenCar", group: "car", label: "Xanh SM Car (taxi điện)", oneWay: greenCarFare(roadKm), note: `${app}, bảng giá cũ hơn` },
  ];
  const totals = raw.map((o) => (o.mode === "motorbike" ? motorFuelOne * legs + parking : o.oneWay * legs));
  const options: TravelOption[] = raw.map((o, i) => {
    const total = totals[i];
    const bestInGroup = raw.every((p, j) => p.group !== o.group || totals[j] >= total);
    return { ...o, total, afterSupport: Math.max(0, total - support), bestInGroup };
  });
  const cheapest = options.reduce((a, b) => (b.total < a.total ? b : a)).mode;
  return { parking, support, straightKm, roadKm, minutes: travelMinutes(roadKm, departure), legs, options, cheapest };
}

export function formatVnd(v: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(v))}đ`;
}

/** Liên kết chỉ đường Google Maps tới bệnh viện (tìm theo tên, không cần toạ độ). Điểm đi để trống = vị trí hiện tại. */
export function directionsUrl(hospitalName: string, district?: string | null, city?: string | null): string {
  const dest = [hospitalName, district, city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

/** Khoảng cách đường chim bay (km) giữa hai toạ độ, công thức haversine. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface ReferenceRow {
  roadKm: number;
  /** Tiền xăng xe máy một chiều (chưa gồm gửi xe). */
  fuel: number;
  grabBike: number; beBike: number; greenBike: number;
  grabCar: number; beCar: number; greenCar: number;
}

/** Bảng tham khảo một chiều theo quãng đường đường thực tế (km), để so sánh xăng với Grab, Be, Xanh SM trước khi biết vị trí. */
export function referenceRows(roadKms: number[], litersPer100Km: number = VEHICLE_PRESETS[0].litersPer100Km,
                              fuelPrice: number = TRAVEL_COST.fuelPricePerLiter): ReferenceRow[] {
  return roadKms.map((km) => ({
    roadKm: km,
    fuel: fuelCost(km, litersPer100Km, fuelPrice),
    grabBike: grabBikeFare(km), beBike: beBikeFare(km), greenBike: greenBikeFare(km),
    grabCar: grabCarFare(km), beCar: beCarFare(km), greenCar: greenCarFare(km),
  }));
}

export interface SupportSuggestion {
  roadKm: number;
  /** Cước GrabBike đi và về (mức hợp lý tối đa người hiến phải chi để tới cơ sở). */
  grabBikeRoundTrip: number;
  /** Tiền xăng xe máy đi và về (chưa gồm gửi xe). */
  motorRoundTrip: number;
  /** Số tiền gợi ý ghi nhận: không vượt mức cơ sở công bố, không vượt chi phí đi lại ước tính. */
  suggested: number;
}

/**
 * Gợi ý số tiền hỗ trợ cho một lượt hiến dựa trên khoảng cách thật từ nhà người hiến tới cơ sở:
 * lấy thấp hơn giữa mức cơ sở công bố và cước GrabBike đi và về, làm tròn 1.000đ, tối thiểu 1.000đ.
 * Không biết khoảng cách thì dùng đúng mức cơ sở công bố. Cơ sở không công bố mức (0) thì không gợi ý (0).
 */
export function suggestSupport(straightKm: number | null | undefined, policyVnd: number,
                               fuelPrice: number = TRAVEL_COST.fuelPricePerLiter): SupportSuggestion {
  if (policyVnd <= 0) return { roadKm: 0, grabBikeRoundTrip: 0, motorRoundTrip: 0, suggested: 0 };
  if (straightKm == null) return { roadKm: 0, grabBikeRoundTrip: 0, motorRoundTrip: 0, suggested: policyVnd };
  const roadKm = roadKmFrom(straightKm);
  const grabBikeRoundTrip = grabBikeFare(roadKm) * 2;
  const motorRoundTrip = fuelCost(roadKm, VEHICLE_PRESETS[0].litersPer100Km, fuelPrice) * 2;
  const suggested = Math.max(1_000, Math.min(policyVnd, roundVnd(grabBikeRoundTrip)));
  return { roadKm, grabBikeRoundTrip, motorRoundTrip, suggested };
}

/** "2026-11-12" -> "12/11" (ngày hiệu lực giá xăng, hiện gọn). */
export function shortDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

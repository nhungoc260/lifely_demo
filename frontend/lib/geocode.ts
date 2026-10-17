/** Chuẩn hóa kết quả tìm địa điểm từ Nominatim và Photon (đều miễn phí, dựa trên OpenStreetMap). Dùng cho `app/geocode/route.ts`. */

export interface Place { lat: number; lng: number; label: string }

// Khung bao Việt Nam (kinh độ/vĩ độ), dùng để lọc kết quả và gợi ý cho Photon.
export const VN_BBOX = { minLon: 102.1, minLat: 8.4, maxLon: 109.6, maxLat: 23.4 };
export const inVietnam = (lat: number, lng: number): boolean =>
  lat >= VN_BBOX.minLat && lat <= VN_BBOX.maxLat && lng >= VN_BBOX.minLon && lng <= VN_BBOX.maxLon;

export function fromNominatim(data: unknown): Place[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((d: { lat?: string; lon?: string; display_name?: string }) => {
    const lat = Number(d.lat), lng = Number(d.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) && inVietnam(lat, lng) ? [{ lat, lng, label: d.display_name ?? "" }] : [];
  });
}

export function fromPhoton(data: unknown): Place[] {
  const features = (data as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((f: { geometry?: { coordinates?: number[] }; properties?: Record<string, string> }) => {
    const c = f.geometry?.coordinates;
    if (!c || c.length < 2) return [];
    const lng = Number(c[0]), lat = Number(c[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inVietnam(lat, lng)) return [];
    const p = f.properties ?? {};
    const label = [p.name, p.street, p.district, p.city, p.state].filter(Boolean).join(", ");
    return [{ lat, lng, label }];
  });
}

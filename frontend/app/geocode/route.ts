import { fromNominatim, fromPhoton, VN_BBOX, type Place } from "@/lib/geocode";

/**
 * Tìm địa điểm cho bản đồ. Gọi từ máy chủ của app (không gọi thẳng từ trình duyệt) để:
 *  - gửi User-Agent định danh như chính sách sử dụng của Nominatim yêu cầu,
 *  - tránh trình duyệt/mạng điện thoại/tiện ích chặn yêu cầu gọi chéo,
 *  - có dịch vụ dự phòng (Photon) khi Nominatim từ chối hoặc quá tải.
 * Không dùng khóa API, không lưu dữ liệu người dùng; chỉ chuyển tiếp từ khóa tìm kiếm.
 */
export const dynamic = "force-dynamic";

const UA = "LIFELY-demo/1.0 (https://lifely-demo.vercel.app)";
const TIMEOUT_MS = 6000;

async function viaNominatim(q: string): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=vn&accept-language=vi&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return fromNominatim(await res.json());
}

async function viaPhoton(q: string): Promise<Place[]> {
  const b = VN_BBOX;
  const url = `https://photon.komoot.io/api/?limit=5&lang=default&bbox=${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  return fromPhoton(await res.json());
}

export async function GET(request: Request): Promise<Response> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 120) {
    return Response.json({ results: [], error: "Từ khóa cần từ 2 đến 120 ký tự." }, { status: 400 });
  }
  let results: Place[] = [];
  let reachedAny = false;
  for (const provider of [viaNominatim, viaPhoton]) {
    try {
      results = await provider(q);
      reachedAny = true;
      if (results.length > 0) break; // có kết quả thì dừng; không có thì thử dịch vụ còn lại
    } catch {
      // thử dịch vụ tiếp theo
    }
  }
  if (!reachedAny) return Response.json({ results: [], error: "Dịch vụ tìm địa điểm đang không phản hồi." }, { status: 502 });
  return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}

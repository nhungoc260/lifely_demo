/** Định vị người dùng, có thông báo lý do cụ thể và tự thử lại một lần. */

export interface GeoFix { lat: number; lng: number }

/** Mã lỗi của GeolocationPositionError: 1 bị từ chối, 2 không xác định được, 3 quá thời gian. */
export function describeGeoError(code: number | undefined, secureContext = true): string {
  if (!secureContext) return "Trang cần chạy qua HTTPS mới dùng được định vị.";
  switch (code) {
    case 1: return "Bạn đã chặn quyền vị trí. Hãy cho phép vị trí cho trình duyệt hoặc ứng dụng LIFELY trong Cài đặt của thiết bị, rồi thử lại.";
    case 2: return "Thiết bị chưa xác định được vị trí. Hãy bật Dịch vụ định vị (GPS hoặc Wi-Fi) rồi thử lại.";
    case 3: return "Lấy vị trí quá lâu. Hãy thử lại ở nơi có sóng tốt hơn hoặc chọn thủ công trên bản đồ.";
    default: return "Không lấy được vị trí của bạn. Bạn có thể tìm địa điểm hoặc chọn trên bản đồ.";
  }
}

function getOnce(opts: PositionOptions): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      opts,
    );
  });
}

/**
 * Lần 1: định vị nhanh bằng mạng (10 giây, chấp nhận vị trí lưu trong 5 phút).
 * Nếu thất bại vì không xác định được hoặc quá giờ (không phải do bị từ chối), thử lại lần 2 bằng độ chính xác cao (20 giây).
 * Ném Error có `message` tiếng Việt, sẵn sàng hiển thị cho người dùng.
 */
export async function locateUser(): Promise<GeoFix> {
  const secure = typeof window === "undefined" ? true : window.isSecureContext;
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) throw new Error("Trình duyệt của bạn không hỗ trợ định vị.");
  if (!secure) throw new Error(describeGeoError(undefined, false));
  try {
    return await getOnce({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  } catch (first) {
    const code = (first as { code?: number }).code;
    if (code === 1) throw new Error(describeGeoError(1));
    try {
      return await getOnce({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    } catch (second) {
      throw new Error(describeGeoError((second as { code?: number }).code ?? code));
    }
  }
}

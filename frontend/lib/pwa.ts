/** Hàm thuần cho PWA: dễ kiểm thử, không đụng vào window. */

/** iPhone/iPod/iPad (kể cả iPadOS 13+ tự nhận là Mac nhưng có màn hình cảm ứng). */
export function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return platform === "MacIntel" && maxTouchPoints > 1;
}

/** Ứng dụng đang chạy như app đã cài (không còn thanh địa chỉ trình duyệt). */
export function isStandaloneDisplay(displayModeStandalone: boolean, navigatorStandalone: boolean | undefined): boolean {
  return displayModeStandalone || navigatorStandalone === true;
}

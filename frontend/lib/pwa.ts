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

/** Trình duyệt nhúng trong app khác (Zalo, Facebook, Messenger, Instagram, TikTok, Line...): không cài được PWA, phải mở bằng Safari/Chrome. */
export function isInAppBrowser(userAgent: string): boolean {
  return /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|TikTok|musical_ly|Line\/|MicroMessenger/i.test(userAgent);
}

export function isAndroidDevice(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/** Safari thật trên iOS (không phải Chrome/Firefox/Edge/Opera trên iOS và không phải trình duyệt nhúng). */
export function isIosSafari(userAgent: string): boolean {
  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(userAgent) && !isInAppBrowser(userAgent);
}

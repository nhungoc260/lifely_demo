/**
 * Tạo liên kết `tel:` an toàn từ số điện thoại hiển thị. LIFELY không tự gọi điện: liên kết này chỉ mở
 * ứng dụng gọi điện mặc định của thiết bị và người dùng phải chủ động bấm gọi.
 * Trả null nếu số thiếu hoặc không hợp lệ (cho phép dấu +, khoảng trắng, chấm, gạch ngang, ngoặc; 8-15 chữ số).
 */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
}

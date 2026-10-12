/**
 * Thông tin liên hệ. Đổi trong .env.local (NEXT_PUBLIC_*) mà không cần sửa code.
 * Đây là số điện thoại của người thật: chỉ đưa vào khi người đó đồng ý hiển thị công khai.
 */
function contact(name: string, rawPhone: string, email?: string) {
  const phone = rawPhone.replace(/\D/g, "");
  return {
    name,
    phone,
    phoneDisplay: phone.length === 10 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone,
    telHref: `tel:${phone}`,
    email,
    mailHref: email ? `mailto:${email}` : undefined,
  } as const;
}

/** Nhân viên hỗ trợ: hiện ở ô chat "Liên hệ nhân viên", trang lỗi, poster, trang thông tin. */
export const SUPPORT = {
  ...contact(
    process.env.NEXT_PUBLIC_SUPPORT_NAME ?? "Như Ngọc",
    process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "0765099748",
    "nguyentrannhungoc260@gmail.com",
  ),
  /** Số cấp cứu y tế của Việt Nam. */
  emergencyNumber: "115",
} as const;

/** Số hỗ trợ của hệ thống LIFELY: chỉ hiện ở chân trang. */
export const SYSTEM_SUPPORT = contact(
  process.env.NEXT_PUBLIC_SYSTEM_SUPPORT_NAME ?? "Lifely",
  process.env.NEXT_PUBLIC_SYSTEM_SUPPORT_PHONE ?? "0708045681",
);

/** Danh sách nhân viên hiện trong ô chat "Liên hệ nhân viên". */
export const STAFF = [
  SUPPORT,
  contact("Ngọc Thắm", "0337109502", "dvngoctham005@gmail.com"),
] as const;

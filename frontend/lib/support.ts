/**
 * Thông tin liên hệ nhân viên hỗ trợ. Đổi trong .env.local (NEXT_PUBLIC_*) mà không cần sửa code.
 * Đây là số điện thoại của một người thật: chỉ đưa vào khi người đó đồng ý hiển thị công khai.
 */
const phone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "0765099748").replace(/\D/g, "");

export const SUPPORT = {
  name: process.env.NEXT_PUBLIC_SUPPORT_NAME ?? "Như Ngọc",
  phone,
  phoneDisplay: phone.length === 10 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone,
  telHref: `tel:${phone}`,
  /** Số cấp cứu y tế của Việt Nam. */
  emergencyNumber: "115",
} as const;

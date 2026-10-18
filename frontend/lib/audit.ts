/** Chuyển metadata thô của nhật ký thành câu đọc được cho admin. Chỉ dịch các khóa đã biết, không bao giờ in giá trị lạ nguyên dạng JSON. */

const KEY: Record<string, string> = {
  bloodType: "Nhóm máu", units: "Số đơn vị", urgency: "Mức độ", status: "Trạng thái", result: "Kết quả liên hệ",
  reason: "Lý do", targetType: "Đối tượng bị báo cáo", requestId: "Mã yêu cầu", note: "Ghi chú", source: "Nguồn",
};

const VALUE: Record<string, string> = {
  CRITICAL: "Nguy kịch", URGENT: "Khẩn cấp", NORMAL: "Bình thường",
  NOT_CONTACTED: "Chưa liên hệ", CONTACTED: "Đã liên hệ", UNREACHABLE: "Không liên lạc được",
  CONFIRMED_CAN_JOIN: "Xác nhận có thể tham gia", CANNOT_JOIN: "Không thể tham gia",
  REQUEST: "Yêu cầu máu", USER: "Người dùng", ORGANIZATION: "Tổ chức",
  FAKE_REQUEST: "Yêu cầu giả", SPAM: "Spam", INCORRECT_INFORMATION: "Thông tin sai", ABUSE: "Lạm dụng", OTHER: "Khác",
};

/** Trả về chuỗi như "Nhóm máu: O+ · Số đơn vị: 2 · Mức độ: Nguy kịch" (rỗng nếu không có gì đáng hiển thị). */
export function describeAudit(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(metadata)) {
    const label = KEY[k];
    if (!label) continue;                                   // khóa lạ: bỏ qua thay vì lộ dữ liệu thô
    if (v === null || v === undefined || typeof v === "object") continue;
    if (k === "requestId") continue;                        // mã nội bộ, không có ích cho người đọc
    const text = String(v);
    parts.push(`${label}: ${VALUE[text] ?? text}`);
  }
  return parts.join(" · ");
}

/** Hiển thị người thực hiện: "Tên (email)", hoặc "Hệ thống" nếu không có người dùng. */
export function actorLabel(userName: string | null | undefined, userEmail: string | null | undefined, userId: string | null | undefined): { primary: string; secondary: string } {
  if (userName) return { primary: userName, secondary: userEmail ?? "" };
  if (userEmail) return { primary: userEmail, secondary: "" };
  if (userId) return { primary: "Tài khoản đã xóa", secondary: userId.slice(0, 8) };
  return { primary: "Hệ thống", secondary: "" };
}

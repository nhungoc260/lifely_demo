import type { AbuseAutoAction, AbuseSeverity } from "@/types/domain";

/** Mã quy tắc phải khớp AbuseRules.java ở backend. Có test đảm bảo mọi mã đều có nhãn. */
export const ABUSE_RULE_CODES = [
  "PHONE_SHARED", "REQUEST_BURST", "REQUEST_FREQUENT", "REPEATED_CANCEL", "NEW_ACCOUNT_CRITICAL", "HIGH_UNITS",
  "HOME_FAR_FROM_HOSPITAL", "DONATION_TOO_SOON", "DONATED_BEFORE_START", "DONATED_TOO_FAST", "SUPPORT_OVER_LIMIT",
  "ORG_SUPPORT_BURST", "MATCH_COMPLETED_TOO_FAST",
] as const;

export const RULE_LABEL: Record<(typeof ABUSE_RULE_CODES)[number], { title: string; why: string }> = {
  PHONE_SHARED: { title: "Nhiều tài khoản chung số điện thoại", why: "Dấu hiệu nuôi tài khoản để tạo yêu cầu giả, lấy quà hoặc tiền hỗ trợ." },
  REQUEST_BURST: { title: "Tạo yêu cầu dồn dập", why: "Từ 5 yêu cầu trong 1 giờ không phải nhu cầu máu thật." },
  REQUEST_FREQUENT: { title: "Tạo yêu cầu thường xuyên", why: "Từ 3 yêu cầu trong 24 giờ, cần xem có hợp lý không." },
  REPEATED_CANCEL: { title: "Hủy rồi tạo lại liên tục", why: "Có thể đang dò quy tắc của hệ thống." },
  NEW_ACCOUNT_CRITICAL: { title: "Tài khoản mới, yêu cầu nguy kịch, chưa gắn bệnh viện", why: "Ca thật vẫn có thể như vậy, nên chỉ cần xem nhanh." },
  HIGH_UNITS: { title: "Số đơn vị lớn, chưa gắn bệnh viện đã xác minh", why: "Từ 10 đơn vị mà không có cơ sở xác nhận thì khó kiểm chứng." },
  HOME_FAR_FROM_HOSPITAL: { title: "Nhà cách bệnh viện rất xa", why: "Có thể bệnh nhân từ tỉnh xa lên; chỉ cần xác minh, không phải vi phạm." },
  DONATION_TOO_SOON: { title: "Hiến liên tiếp dưới 12 tuần", why: "Hiến dồn dập để nhận tiền, quà; cũng nguy hại sức khỏe người hiến." },
  DONATED_BEFORE_START: { title: "Xác nhận đã hiến trước giờ bắt đầu", why: "Không thể hiến trước khung giờ: nghi xác nhận khống." },
  DONATED_TOO_FAST: { title: "Xác nhận đã hiến quá nhanh", why: "Khám sàng lọc và lấy máu cần hơn 20 phút." },
  SUPPORT_OVER_LIMIT: { title: "Hỗ trợ đi lại vượt mức quy định", why: "Quy định tối đa 50.000đ mỗi lần hiến." },
  MATCH_COMPLETED_TOO_FAST: { title: "Xác nhận đã hiến quá sớm sau khi nhận lời (khẩn cấp)", why: "Cần di chuyển, khám sàng lọc và lấy máu: dưới 5 phút là không thể, dưới 20 phút là đáng ngờ." },
  ORG_SUPPORT_BURST: { title: "Cơ sở ghi nhận hỗ trợ dồn dập", why: "Từ 20 lượt trong 1 giờ, cần đối chiếu sổ sách." },
};

export function ruleLabel(code: string): { title: string; why: string } {
  return (RULE_LABEL as Record<string, { title: string; why: string }>)[code] ?? { title: code, why: "" };
}

export const AUTO_ACTION_LABEL: Record<AbuseAutoAction, string> = {
  NONE: "Chỉ cảnh báo, vẫn xử lý bình thường",
  AUTO_CANCELLED: "Đã tự động hủy yêu cầu",
  SUPPORT_BLOCKED: "Đã chặn ghi nhận hỗ trợ đi lại",
};

export const SEVERITY_LABEL: Record<AbuseSeverity, string> = { HIGH: "Cao", MEDIUM: "Cần xem" };

export const SUBJECT_LABEL = { REQUEST: "Yêu cầu máu", APPOINTMENT: "Lịch hiến", MATCH: "Lượt hiến khẩn cấp", ORGANIZATION: "Cơ sở" } as const;

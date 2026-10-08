/** Nhãn tiếng Việt cho các giá trị enum từ backend. Mã gốc (CRITICAL, DONOR…) vẫn dùng cho logic, chỉ hiển thị mới dùng nhãn. */
import type { ContactStatus, MatchStatus, OrgStatus, OrgType, ReportReason, ReportStatus, Role, Urgency } from "@/types/domain";

export const URGENCY_LABEL: Record<Urgency, string> = { CRITICAL: "NGUY KỊCH", URGENT: "KHẨN", NORMAL: "BÌNH THƯỜNG" };

export const MATCH_LABEL: Record<MatchStatus, string> = {
  PENDING: "Chờ liên hệ", CONTACTED: "Đã liên hệ", ACCEPTED: "Đã nhận lời", REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy", COMPLETED: "Đã hiến máu", EXPIRED: "Hết hiệu lực",
};

export const ORG_STATUS_LABEL: Record<OrgStatus, string> = {
  PENDING: "Chờ xử lý", UNDER_REVIEW: "Đang xem xét", VERIFIED: "Đã xác minh", REJECTED: "Đã từ chối", SUSPENDED: "Tạm khóa",
};

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  HOSPITAL: "Bệnh viện", BLOOD_CENTER: "Trung tâm máu", CLINIC: "Phòng khám", NGO: "Tổ chức phi chính phủ",
};

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  FAKE_REQUEST: "Yêu cầu giả", SPAM: "Spam", INCORRECT_INFORMATION: "Thông tin sai lệch", ABUSE: "Quấy rối / lạm dụng", OTHER: "Khác",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: "Đang mở", INVESTIGATING: "Đang điều tra", RESOLVED: "Đã xử lý", REJECTED: "Đã bác bỏ",
};

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = { NEW: "Mới", READ: "Đã đọc", RESOLVED: "Đã xử lý" };

export const ROLE_LABEL: Record<Role, string> = {
  DONOR: "Người hiến máu", REQUESTER: "Người cần máu", ORGANIZATION: "Tổ chức", ADMIN: "Admin",
};

export const TARGET_LABEL: Record<"REQUEST" | "USER" | "ORGANIZATION", string> = {
  REQUEST: "yêu cầu", USER: "người dùng", ORGANIZATION: "tổ chức",
};

/** Nhật ký hoạt động: mã hành động (giữ nguyên để lọc) và mô tả tiếng Việt để hiển thị. */
export const AUDIT_LABEL: Record<string, string> = {
  LOGIN: "Đăng nhập", USER_REGISTERED: "Đăng ký tài khoản", REQUEST_CREATED: "Tạo yêu cầu",
  REQUEST_VERIFIED: "Xác minh yêu cầu", REQUEST_REJECTED: "Từ chối yêu cầu", REQUEST_CANCELLED: "Hủy yêu cầu",
  MATCH_ACCEPTED: "Người hiến máu nhận lời", MATCH_REJECTED: "Người hiến máu từ chối", MATCH_COMPLETED: "Hoàn tất hiến máu",
  ORGANIZATION_VERIFIED: "Xác minh tổ chức", ORGANIZATION_REJECTED: "Từ chối tổ chức", ORGANIZATION_SUSPENDED: "Tạm khóa tổ chức",
  USER_SUSPENDED: "Khóa người dùng", USER_ACTIVATED: "Kích hoạt người dùng", REPORT_CREATED: "Tạo báo cáo vi phạm",
  REPORT_UPDATED: "Cập nhật báo cáo", PASSWORD_RESET: "Đặt lại mật khẩu", ACCOUNT_EXPORTED: "Tải dữ liệu cá nhân",
  ACCOUNT_DELETED: "Xóa tài khoản",
};

import { formatDateTime } from "@/lib/format";
import type { AppointmentAction, AppointmentStatus } from "@/types/domain";

/** Nhãn trạng thái lịch hẹn. Phân biệt rõ: đã đặt ≠ đã đến ≠ đã sàng lọc ≠ đã hiến (cơ sở xác nhận). */
export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  BOOKED: "Đã đặt lịch",
  CHECKED_IN: "Đã đến cơ sở",
  SCREENED: "Đã sàng lọc",
  DONATED: "Đã hiến (cơ sở xác nhận)",
  DEFERRED: "Chưa thể hiến lần này",
  NO_SHOW: "Không đến",
  CANCELLED: "Đã hủy",
};

/** Thao tác nhân viên được phép ở từng trạng thái (khớp ma trận chuyển trạng thái ở backend). */
export const ORG_ACTIONS: Record<AppointmentStatus, { action: AppointmentAction; label: string }[]> = {
  BOOKED: [{ action: "CHECK_IN", label: "Đã đến" }, { action: "NO_SHOW", label: "Không đến" }],
  CHECKED_IN: [{ action: "SCREEN_PASS", label: "Đạt sàng lọc" }, { action: "DEFER", label: "Hoãn hiến" }],
  SCREENED: [{ action: "DONATED", label: "Xác nhận đã hiến" }, { action: "DEFER", label: "Hoãn hiến" }],
  DONATED: [], DEFERRED: [], NO_SHOW: [], CANCELLED: [],
};

export function formatSlotRange(startsAt: string, endsAt: string): string {
  const end = new Date(endsAt);
  const hh = String(end.getHours()).padStart(2, "0");
  const mm = String(end.getMinutes()).padStart(2, "0");
  return `${formatDateTime(startsAt)} – ${hh}:${mm}`;
}

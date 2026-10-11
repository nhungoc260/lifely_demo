import { readiness } from "@/lib/donor";
import { formatDate } from "@/lib/format";

export type DonorStatusKind = "INCOMPLETE" | "OFF" | "RESTING" | "READY";

export interface DonorStatus {
  kind: DonorStatusKind;
  title: string;
  description: string;
  tone: "success" | "warning" | "muted";
  action?: { href: string; label: string };
}

/**
 * Gộp ba thông tin (hồ sơ, công tắc sẵn sàng, thời gian nghỉ giữa hai lần hiến) thành MỘT trạng thái duy nhất
 * để người hiến máu không thấy hai thông báo mâu thuẫn. Thứ tự ưu tiên: hồ sơ chưa đủ > đang tắt > đang nghỉ > sẵn sàng.
 * Đây chỉ là quy tắc sắp xếp lịch của LIFELY, không phải kết luận y tế.
 */
export function donorStatus(input: {
  profileComplete: boolean;
  available: boolean;
  lastDonationDate: string | null;
  todayIso: string;
}): DonorStatus {
  if (!input.profileComplete) {
    return {
      kind: "INCOMPLETE",
      title: "Hoàn tất hồ sơ để nhận yêu cầu",
      description: "LIFELY cần nhóm máu và khu vực của bạn để tìm các yêu cầu ở gần.",
      tone: "warning",
      action: { href: "/donor/profile", label: "Hoàn tất hồ sơ" },
    };
  }
  if (!input.available) {
    return {
      kind: "OFF",
      title: "Bạn đang tắt nhận yêu cầu",
      description: "LIFELY sẽ không gửi yêu cầu mới cho bạn. Bạn có thể bật lại bất cứ lúc nào.",
      tone: "muted",
    };
  }
  const r = readiness(input.lastDonationDate, input.todayIso);
  if (!r.ready && r.nextDate) {
    return {
      kind: "RESTING",
      title: "Bạn đang trong thời gian nghỉ giữa hai lần hiến",
      description: `LIFELY sẽ chưa gửi yêu cầu mới cho bạn đến ${formatDate(r.nextDate)} (còn ${r.daysLeft} ngày). Đây chỉ là quy tắc sắp xếp lịch, không phải kết luận y tế.`,
      tone: "warning",
    };
  }
  return {
    kind: "READY",
    title: "Bạn đang sẵn sàng hiến máu",
    description: "LIFELY sẽ liên hệ bạn khi có yêu cầu đã xác minh phù hợp ở gần. Việc bạn có đủ điều kiện hiến máu hay không do nhân viên y tế quyết định.",
    tone: "success",
  };
}

import type { RequestStatus } from "@/types/domain";

export const CLOSED_STATUSES: RequestStatus[] = ["FULFILLED", "CANCELLED", "EXPIRED"];

export function isClosed(status: RequestStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Câu mô tả tiến độ bằng lời thường cho người cần máu: đang ở bước nào và họ có phải làm gì không.
 * Chỉ nói điều hệ thống thực sự làm: yêu cầu của người nhà phải được quản trị viên xác minh thì mới bắt đầu tìm người hiến.
 */
export function requestProgressText(status: RequestStatus, confirmed: number, required: number): string {
  switch (status) {
    case "CREATED":
      return "Yêu cầu vừa được tạo và đang được gửi đi xác minh.";
    case "PENDING_VERIFICATION":
      return "Đang chờ quản trị viên xác minh. Sau khi được xác minh, LIFELY sẽ bắt đầu tìm người hiến.";
    case "VERIFIED":
    case "MATCHING":
      return "Đã xác minh. LIFELY đang tìm người hiến phù hợp gần bệnh viện.";
    case "DONORS_CONTACTED":
      return confirmed > 0
        ? `${confirmed}/${required} người hiến đã nhận lời. Mở yêu cầu để xem cách liên hệ.`
        : "Đã gửi yêu cầu tới người hiến phù hợp. Chưa có ai nhận lời; kết quả sẽ tự cập nhật ở đây.";
    case "PARTIALLY_FULFILLED":
      return `${confirmed}/${required} người hiến đã nhận lời. LIFELY tiếp tục tìm thêm người hiến.`;
    case "FULFILLED":
      return "Đã đủ người hiến. Mở yêu cầu để xem cách liên hệ.";
    case "CANCELLED":
      return "Yêu cầu đã được hủy.";
    case "EXPIRED":
      return "Yêu cầu đã hết hạn mà chưa đủ người hiến.";
  }
}

export function splitRequests<T extends { status: RequestStatus }>(items: T[]): { open: T[]; closed: T[] } {
  return { open: items.filter((i) => !isClosed(i.status)), closed: items.filter((i) => isClosed(i.status)) };
}

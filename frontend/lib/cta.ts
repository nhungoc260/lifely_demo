import type { Role } from "@/types/domain";

/** Ý định của các nút kêu gọi hành động ở trang chủ. */
export type CtaIntent = "NEED_BLOOD" | "DONATE" | "JOIN_ORG";

const HOME: Record<Role, string> = {
  DONOR: "/donor/dashboard",
  REQUESTER: "/requester/dashboard",
  ORGANIZATION: "/organization/dashboard",
  ADMIN: "/admin/dashboard",
};

/**
 * Đích đến của nút ở trang chủ theo trạng thái đăng nhập. Người đã đăng nhập không bị đẩy qua đăng ký/đăng nhập nữa;
 * vai trò không làm được việc đó (ví dụ người hiến bấm "Tôi cần máu") về trang chính của chính họ.
 * Khớp quyền ở backend: chỉ REQUESTER và ORGANIZATION được tạo yêu cầu máu.
 */
export function ctaHref(role: Role | null, intent: CtaIntent): string {
  if (role === null) {
    // Khách: giữ hành vi cũ (trang tạo yêu cầu sẽ tự yêu cầu đăng nhập)
    return intent === "NEED_BLOOD" ? "/requester/requests/create"
      : intent === "DONATE" ? "/register?role=DONOR" : "/register?role=ORGANIZATION";
  }
  switch (intent) {
    case "NEED_BLOOD":
      return role === "REQUESTER" ? "/requester/requests/create"
        : role === "ORGANIZATION" ? "/organization/requests/create" : HOME[role];
    case "DONATE":
      return role === "DONOR" ? "/donor/requests" : HOME[role];
    case "JOIN_ORG":
      return HOME[role];
  }
}

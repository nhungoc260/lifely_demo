export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

/** 01:42:18 */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export const STATUS_LABEL: Record<string, string> = {
  CREATED: "Created",
  PENDING_VERIFICATION: "Pending verification",
  VERIFIED: "Verified",
  MATCHING: "Matching",
  DONORS_CONTACTED: "Donors contacted",
  PARTIALLY_FULFILLED: "Partially fulfilled",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

/** Khoảng nghỉ tối thiểu giữa hai lần hiến mà LIFELY dùng để LÊN LỊCH LIÊN HỆ (khớp lifely.matching.min-days-between-donations). */
export const MIN_DAYS_BETWEEN_DONATIONS = 84;

export interface Readiness {
  ready: boolean;
  /** Ngày đầu tiên LIFELY có thể liên hệ lại (ISO yyyy-mm-dd). Null nếu đã sẵn sàng. */
  nextDate: string | null;
  daysLeft: number;
}

function toUtcDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Tính ngày LIFELY có thể liên hệ lại donor. Đây chỉ là lịch điều phối, KHÔNG phải kết luận y tế:
 * điều kiện hiến máu do nhân viên y tế quyết định.
 */
export function readiness(lastDonationDate: string | null, todayIso: string, minDays = MIN_DAYS_BETWEEN_DONATIONS): Readiness {
  if (!lastDonationDate) return { ready: true, nextDate: null, daysLeft: 0 };
  const next = toUtcDay(lastDonationDate) + minDays * 86_400_000;
  const left = Math.ceil((next - toUtcDay(todayIso)) / 86_400_000);
  if (left <= 0) return { ready: true, nextDate: null, daysLeft: 0 };
  return { ready: false, nextDate: new Date(next).toISOString().slice(0, 10), daysLeft: left };
}

export interface Milestone {
  id: string;
  label: string;
  description: string;
  threshold: number;
}

export const MILESTONES: Milestone[] = [
  { id: "first", label: "Bước đầu tiên", description: "Lần hiến máu đầu tiên của bạn", threshold: 1 },
  { id: "three", label: "Thường xuyên", description: "3 lần hiến máu", threshold: 3 },
  { id: "five", label: "Tận tâm", description: "5 lần hiến máu", threshold: 5 },
  { id: "ten", label: "Người cứu sinh mạng", description: "10 lần hiến máu", threshold: 10 },
];

export function milestoneProgress(total: number): { earned: Milestone[]; next: Milestone | null } {
  const earned = MILESTONES.filter((m) => total >= m.threshold);
  const next = MILESTONES.find((m) => total < m.threshold) ?? null;
  return { earned, next };
}

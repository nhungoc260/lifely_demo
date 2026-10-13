import type { BloodRequest } from "@/types/domain";

const DAY = 24 * 3600 * 1000;
const CLOSED = ["FULFILLED", "CANCELLED", "EXPIRED"];

/** Thứ Hai 00:00 của tuần chứa ngày d. */
function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function summarize(requests: BloodRequest[], weeks = 8) {
  const total = requests.length;
  const fulfilled = requests.filter((r) => r.status === "FULFILLED");
  const closed = requests.filter((r) => CLOSED.includes(r.status));
  const unitsRequired = requests.reduce((s, r) => s + r.unitsRequired, 0);
  const unitsConfirmed = requests.reduce((s, r) => s + r.unitsConfirmed, 0);
  const critical = requests.filter((r) => r.urgency === "CRITICAL").length;

  const hours = fulfilled.map((r) => (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 3600000).filter((h) => h >= 0);

  const thisWeek = weekStart(new Date());
  const perWeek = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(thisWeek.getTime() - (weeks - 1 - i) * 7 * DAY);
    return { start, label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`, total: 0, critical: 0 };
  });
  for (const r of requests) {
    const idx = perWeek.findIndex((w, i) => {
      const t = new Date(r.createdAt).getTime();
      return t >= w.start.getTime() && (i === weeks - 1 || t < perWeek[i + 1].start.getTime());
    });
    if (idx >= 0) { perWeek[idx].total += 1; if (r.urgency === "CRITICAL") perWeek[idx].critical += 1; }
  }

  const count = <K extends string>(key: (r: BloodRequest) => K) => {
    const m = new Map<K, number>();
    for (const r of requests) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
    return [...m.entries()];
  };
  const BLOOD_ORDER = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const byBlood = count((r) => r.bloodType)
    .map(([bloodType, requests]) => ({ bloodType, requests }))
    .sort((a, b) => BLOOD_ORDER.indexOf(a.bloodType) - BLOOD_ORDER.indexOf(b.bloodType));
  const byStatus = count((r) => r.status).map(([status, total]) => ({ status, total }));

  return {
    total,
    critical,
    fulfilledCount: fulfilled.length,
    fulfillRate: closed.length ? Math.round((fulfilled.length / closed.length) * 100) : null,
    unitsRequired,
    unitsConfirmed,
    unitsRate: unitsRequired ? Math.round((unitsConfirmed / unitsRequired) * 100) : null,
    avgHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
    perWeek: perWeek.map(({ label, total, critical }) => ({ label, total, critical })),
    byBlood,
    byStatus,
  };
}

export function formatHours(h: number | null) {
  if (h === null) return "–";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} phút`;
  if (h < 48) return `${h.toFixed(1)} giờ`;
  return `${(h / 24).toFixed(1)} ngày`;
}

import type { HealthCheck, HealthFinding } from "@/types/domain";

export interface ChartPoint { label: string; value: number | null; outside: boolean }
export interface ChartBand { min: number; max: number }

/** Miền trục Y: bao cả dữ liệu lẫn dải ngưỡng, có đệm để điểm không dính mép. */
export function chartDomain(values: (number | null)[], bands: ChartBand[]): { min: number; max: number } {
  const nums = [...values.filter((v): v is number => v !== null), ...bands.flatMap((b) => [b.min, b.max])];
  if (nums.length === 0) return { min: 0, max: 1 };
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const pad = Math.max(2, (hi - lo) * 0.12);
  return { min: Math.floor(lo - pad), max: Math.ceil(hi + pad) };
}

/** Vị trí Y (0 = đỉnh) trong khung cao `height`, trong miền cho trước. */
export function scaleY(value: number, domain: { min: number; max: number }, height: number): number {
  const span = domain.max - domain.min || 1;
  return height - ((value - domain.min) / span) * height;
}

/** Vị trí X cho điểm thứ i trong n điểm, chia đều trong [0, width]. Một điểm đứng giữa. */
export function scaleX(i: number, n: number, width: number): number {
  return n <= 1 ? width / 2 : (i / (n - 1)) * width;
}

export function findingFor(check: HealthCheck, metric: HealthFinding["metric"]): HealthFinding | undefined {
  return check.findings.find((f) => f.metric === metric);
}

export function toPoints(checks: HealthCheck[], pick: (c: HealthCheck) => number | null, metric: HealthFinding["metric"], fmt: (iso: string) => string): ChartPoint[] {
  return checks.map((c) => ({ label: fmt(c.measuredAt), value: pick(c), outside: findingFor(c, metric)?.status === "OUTSIDE" }));
}

/** Một dòng mô tả cho người đọc màn hình: không diễn giải thành chẩn đoán. */
export function describeSeries(name: string, unit: string, points: ChartPoint[]): string {
  const vals = points.filter((p) => p.value !== null);
  if (vals.length === 0) return `${name}: chưa có số liệu.`;
  const out = vals.filter((p) => p.outside).length;
  const last = vals[vals.length - 1];
  return `${name}: ${vals.length} lần đo, gần nhất ${last.value} ${unit} (${last.outside ? "ngoài" : "trong"} ngưỡng sàng lọc sơ bộ); ${out} lần ngoài ngưỡng.`;
}

export function statusText(canDonate: boolean, daysUntilEligible: number, eligibleOn: string | null, formatDate: (iso: string) => string): string {
  if (canDonate) return "Có thể hiến";
  const on = eligibleOn ? ` (từ ${formatDate(eligibleOn)})` : "";
  return `Còn ${daysUntilEligible} ngày nữa mới hiến lại được${on}`;
}

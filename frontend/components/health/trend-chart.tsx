import { chartDomain, describeSeries, scaleX, scaleY, type ChartBand, type ChartPoint } from "@/lib/health";

export interface ChartSeries { name: string; points: ChartPoint[]; stroke: string; fill: string }

const W = 320;
const H = 150;
const PAD = { left: 38, right: 10, top: 10, bottom: 24 };

/**
 * Biểu đồ xu hướng đường đơn giản bằng SVG (không dùng thư viện). Màu lấy từ biến theme nên đọc được ở chế độ tối.
 * Điểm "ngoài ngưỡng" dùng hình thoi (không chỉ dựa vào màu) và KHÔNG dùng màu báo nguy hiểm: đây là sàng lọc sơ bộ, không phải chẩn đoán.
 */
export function TrendChart({ title, unit, series, band }: { title: string; unit: string; series: ChartSeries[]; band: ChartBand }) {
  const all = series.flatMap((s) => s.points);
  const n = Math.max(...series.map((s) => s.points.length), 0);
  if (n === 0) return null;
  const domain = chartDomain(all.map((p) => p.value), [band]);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + scaleX(i, n, iw);
  const y = (v: number) => PAD.top + scaleY(v, domain, ih);
  const ticks = [domain.min, Math.round((domain.min + domain.max) / 2), domain.max];
  const labels = series[0].points;
  const summary = series.map((s) => describeSeries(s.name, unit, s.points)).join(" ");

  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">{title} <span className="font-normal text-muted-foreground">({unit})</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. ${summary}`}>
        <rect x={PAD.left} y={y(band.max)} width={iw} height={Math.max(0, y(band.min) - y(band.max))} className="fill-success/10" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth="0.6" />
            <text x={PAD.left - 5} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">{t}</text>
          </g>
        ))}
        {[band.min, band.max].map((b) => (
          <line key={b} x1={PAD.left} x2={W - PAD.right} y1={y(b)} y2={y(b)} className="stroke-success/60" strokeWidth="0.8" strokeDasharray="3 3" />
        ))}
        {series.map((s) => {
          const pts = s.points.map((p, i) => (p.value === null ? null : { p, i })).filter((q): q is { p: ChartPoint; i: number } => q !== null);
          return (
            <g key={s.name}>
              {pts.length > 1 && <polyline points={pts.map((q) => `${x(q.i)},${y(q.p.value as number)}`).join(" ")} fill="none" className={s.stroke} strokeWidth="1.8" strokeLinejoin="round" />}
              {pts.map((q) => q.p.outside ? (
                <rect key={q.i} x={x(q.i) - 4} y={y(q.p.value as number) - 4} width="8" height="8" transform={`rotate(45 ${x(q.i)} ${y(q.p.value as number)})`} className="fill-warning stroke-background" strokeWidth="1">
                  <title>{`${s.name}: ${q.p.value} ${unit} (ngoài ngưỡng sàng lọc sơ bộ), ${q.p.label}`}</title>
                </rect>
              ) : (
                <circle key={q.i} cx={x(q.i)} cy={y(q.p.value as number)} r="3.4" className={`${s.fill} stroke-background`} strokeWidth="1">
                  <title>{`${s.name}: ${q.p.value} ${unit} (trong ngưỡng sàng lọc sơ bộ), ${q.p.label}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x={PAD.left} y={H - 7} className="fill-muted-foreground" fontSize="9">{labels[0].label}</text>
        {n > 1 && <text x={W - PAD.right} y={H - 7} textAnchor="end" className="fill-muted-foreground" fontSize="9">{labels[n - 1].label}</text>}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1"><span className={`inline-block h-0.5 w-4 ${s.stroke.replace("stroke-", "bg-")}`} aria-hidden />{s.name}</span>)}
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-success/20" aria-hidden />Dải ngưỡng sàng lọc sơ bộ</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rotate-45 bg-warning" aria-hidden />Ngoài ngưỡng</span>
      </div>
    </figure>
  );
}
